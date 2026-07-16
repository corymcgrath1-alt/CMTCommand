import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { hasPermission } from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import { createAuditRequestContext, type AuditRequestContext } from "@/server/audit/request-context";
import {
  mediaAssetAuditState,
  mediaUploadAuditState,
} from "@/server/audit/serializers";
import { appendAuditEvent } from "@/server/audit/writer";
import type { OperationalDatabase } from "@/server/db/client";
import {
  assignmentTechnicians,
  dispatchAssignments,
  mediaAssets,
  mediaDerivatives,
  mediaUploadSessions,
  technicians,
  type DispatchAssignmentStatus,
  type MediaAssetRecord,
  type MediaDerivativeRecord,
  type MediaUploadSessionRecord,
} from "@/server/db/schema";
import type { StoredObjectReference } from "@/server/object-storage/storage";
import {
  createObjectStorage,
  createPresignedPutObjectUrl,
  createStorageGrantToken,
  ObjectStorageError,
  verifyStorageGrantToken,
  type PrivateObjectStorage,
  type StoredObjectFacts,
} from "@/server/object-storage/storage";
import { getRequiredObjectStorageConfig } from "@/server/object-storage/config";
import {
  createMutationMetadata,
  forbidden,
  notFoundOrInaccessible,
  persistenceFailure,
  type OperationalRecordFailure,
  type OperationalRecordMutationMetadata,
} from "@/server/operational-records/results";
import {
  lockOperationalOrganization,
  revalidateOperationalActor,
  type OperationalTransaction,
} from "@/server/operational-records/mutation-context";
import { operationalRecordScopePredicate } from "@/server/operational-records/scope";
import { validationIssues } from "@/server/tenancy/validation";
import {
  declaredTypeCompatible,
  inspectMedia,
  mediaSafetyIssues,
  type AllowedDetectedMediaType,
  type MediaInspection,
} from "./media-type";
import {
  beginMediaUploadInputSchema,
  mediaAssetIdInputSchema,
  mediaReadVariantInputSchema,
  uploadSessionIdInputSchema,
  MAX_MEDIA_UPLOAD_BYTES,
  type MediaReadVariant,
} from "./validation";

const uploadGrantLifetimeMs = 10 * 60 * 1000;
const readGrantLifetimeMs = 5 * 60 * 1000;
const derivativeProcessorName = "cmtcommand-local-preview";
const derivativeProcessorVersion = "1";

type MediaAssignmentRecord = {
  id: string;
  officeId: string;
  status: DispatchAssignmentStatus;
};

export type MediaDerivativeView = {
  id: string;
  derivativeType: "preview" | "thumbnail";
  mediaType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
};

export type MediaAssetView = {
  id: string;
  dispatchAssignmentId: string;
  category: string;
  detectedMediaType: string;
  byteSize: number;
  sha256: string;
  status: string;
  createdAt: string;
  derivatives: MediaDerivativeView[];
};

export type MediaUploadGrant = {
  uploadSessionId: string;
  status: MediaUploadSessionRecord["status"];
  uploadUrl: string | null;
  method: "PUT";
  expiresAt: string;
  requiredHeaders: Record<string, string>;
  mediaAssetId: string | null;
};

export type BeginMediaUploadResult =
  | {
      status: "created" | "ok";
      upload: MediaUploadGrant;
      mutation?: OperationalRecordMutationMetadata;
    }
  | MediaFailure;

export type UploadObjectResult =
  | { status: "ok"; facts: StoredObjectFacts }
  | MediaFailure;

export type CompleteMediaUploadResult =
  | {
      status: "ok";
      value: MediaAssetView;
      duplicate: boolean;
      mutation: OperationalRecordMutationMetadata;
    }
  | MediaFailure;

export type ListMediaAssetsResult =
  | { status: "ok"; values: MediaAssetView[] }
  | MediaFailure;

export type MediaReadGrantResult =
  | {
      status: "ok";
      access: {
        url: string;
        method: "GET";
        expiresAt: string;
        variant: MediaReadVariant;
      };
      mutation: OperationalRecordMutationMetadata;
    }
  | MediaFailure;

export type MediaObjectReadResult =
  | {
      status: "ok";
      body: Buffer;
      mediaType: string;
      byteSize: number;
    }
  | MediaFailure;

export type MediaFailure =
  | OperationalRecordFailure
  | { status: "persistence_error"; reason: "storage_unavailable" }
  | { status: "conflict"; reason: "idempotency_key_reused" | "upload_already_failed" }
  | { status: "validation_error"; issues: string[]; mutation?: OperationalRecordMutationMetadata };

function storageUnavailableFailure(): MediaFailure {
  return { status: "persistence_error", reason: "storage_unavailable" };
}

export async function beginMediaUpload(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<BeginMediaUploadResult> {
  const parsed = beginMediaUploadInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  let storageReference: StoredObjectReference;
  try {
    storageReference = newUploadObjectReference(
      context.membership.organizationId,
      parsed.data.assignmentId,
      randomUUID(),
    );
  } catch {
    return persistenceFailure();
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(
        transaction,
        context.membership.organizationId,
      );
      const assignment = await findAuthorizedAssignmentForMedia(
        transaction,
        context,
        parsed.data.assignmentId,
        "create",
      );
      if ("failure" in assignment) return assignment.failure;
      if (!["assigned", "acknowledged", "in_progress"].includes(assignment.value.status)) {
        return { status: "invalid_transition" };
      }

      const [existing] = await transaction
        .select()
        .from(mediaUploadSessions)
        .where(
          and(
            eq(mediaUploadSessions.organizationId, context.membership.organizationId),
            eq(mediaUploadSessions.dispatchAssignmentId, parsed.data.assignmentId),
            eq(mediaUploadSessions.createdByUserId, context.user.id),
            eq(mediaUploadSessions.idempotencyKey, parsed.data.idempotencyKey),
          ),
        )
        .limit(1);

      if (existing) {
        if (!sameUploadIntent(existing, parsed.data)) {
          return { status: "conflict", reason: "idempotency_key_reused" };
        }
        if (existing.status === "failed") {
          return { status: "conflict", reason: "upload_already_failed" };
        }
        return {
          status: "ok",
          upload: uploadGrantForSession(existing),
        };
      }

      const expiresAt = new Date(Date.now() + uploadGrantLifetimeMs);
      const [session] = await transaction
        .insert(mediaUploadSessions)
        .values({
          organizationId: context.membership.organizationId,
          officeId: assignment.value.officeId,
          dispatchAssignmentId: assignment.value.id,
          createdByUserId: context.user.id,
          createdByMembershipId: context.membership.id,
          category: parsed.data.category,
          originalFilename: parsed.data.originalFilename,
          declaredMediaType: parsed.data.declaredMediaType,
          expectedByteSize: parsed.data.byteSize,
          expectedSha256: parsed.data.sha256,
          idempotencyKey: parsed.data.idempotencyKey,
          storageProvider: storageReference.provider,
          storageBucket: storageReference.bucket,
          storageKey: storageReference.key,
          uploadExpiresAt: expiresAt,
        })
        .returning();

      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: session.officeId,
        action: "media_upload.initiated",
        outcome: "succeeded",
        target: { type: "media_upload_session", id: session.id },
        secondaryTarget: { type: "dispatch_assignment", id: session.dispatchAssignmentId },
        requestContext: auditRequestContext,
        resultingState: mediaUploadAuditState(session),
      });

      return {
        status: "created",
        upload: uploadGrantForSession(session),
        mutation: createMutationMetadata(
          "media_upload.initiated",
          session.id,
          auditEvent,
        ),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function storeMediaUploadObject(
  db: OperationalDatabase,
  uploadSessionId: unknown,
  token: string | null,
  body: Buffer,
  contentType: string | null,
  storage?: PrivateObjectStorage,
): Promise<UploadObjectResult> {
  const parsedId = uploadSessionIdInputSchema.safeParse(uploadSessionId);
  if (!parsedId.success) {
    return { status: "validation_error", issues: validationIssues(parsedId.error) };
  }
  if (body.byteLength <= 0 || body.byteLength > MAX_MEDIA_UPLOAD_BYTES) {
    return { status: "validation_error", issues: ["body: upload size is invalid"] };
  }

  let session: MediaUploadSessionRecord | undefined;
  try {
    [session] = await db
      .select()
      .from(mediaUploadSessions)
      .where(eq(mediaUploadSessions.id, parsedId.data))
      .limit(1);
  } catch {
    return persistenceFailure();
  }

  if (
    !session ||
    session.status !== "pending_upload" ||
    session.uploadExpiresAt.getTime() < Date.now()
  ) {
    return notFoundOrInaccessible();
  }

  const grant = verifyUploadGrant(token, session.id);
  if (!grant) return notFoundOrInaccessible();

  try {
    const storageClient = storage ?? createObjectStorage();
    const facts = await storageClient.putObject({
      provider: "local-test",
      bucket: session.storageBucket,
      key: session.storageKey,
      body,
      contentType: contentType ?? session.declaredMediaType,
    });
    return { status: "ok", facts };
  } catch {
    return persistenceFailure();
  }
}

export async function completeMediaUpload(
  db: OperationalDatabase,
  context: AuthorizationContext,
  uploadSessionId: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
  storage?: PrivateObjectStorage,
): Promise<CompleteMediaUploadResult> {
  const parsedId = uploadSessionIdInputSchema.safeParse(uploadSessionId);
  if (!parsedId.success) {
    return { status: "validation_error", issues: validationIssues(parsedId.error) };
  }

  let session: MediaUploadSessionRecord | undefined;
  try {
    [session] = await db
      .select()
      .from(mediaUploadSessions)
      .where(
        and(
          eq(mediaUploadSessions.id, parsedId.data),
          eq(mediaUploadSessions.organizationId, context.membership.organizationId),
          eq(mediaUploadSessions.createdByUserId, context.user.id),
        ),
      )
      .limit(1);
  } catch {
    return persistenceFailure();
  }

  if (!session) return notFoundOrInaccessible();
  if (session.status === "failed") {
    return { status: "conflict", reason: "upload_already_failed" };
  }
  if (session.status === "completed" && session.completedMediaAssetId) {
    const found = await db.transaction((transaction) =>
      readMediaAssetView(
        transaction,
        context,
        session.completedMediaAssetId as string,
        "read",
      ),
    );
    return found.status === "ok"
      ? {
          status: "ok",
          value: found.value,
          duplicate: session.duplicateOfMediaAssetId !== null,
          mutation: syntheticMutation("media_upload.completed", session),
        }
      : found;
  }

  let body: Buffer;
  try {
    const storageClient = storage ?? createObjectStorage();
    body = await storageClient.getObject({
      provider: "local-test",
      bucket: session.storageBucket,
      key: session.storageKey,
    });
  } catch (error) {
    if (!(error instanceof ObjectStorageError) || error.code !== "object_not_found") {
      return storageUnavailableFailure();
    }
    return markUploadFailed(
      db,
      context,
      session,
      "uploaded object was not found",
      auditRequestContext,
    );
  }

  const actualSha256 = createHash("sha256").update(body).digest("hex");
  const inspection = inspectMedia(body);
  const verificationIssues = verificationFailures(
    session,
    body.byteLength,
    actualSha256,
    inspection,
  );
  if (verificationIssues.length > 0) {
    return markUploadFailed(
      db,
      context,
      session,
      verificationIssues.join("; "),
      auditRequestContext,
    );
  }

  const detected = inspection.detectedMediaType as AllowedDetectedMediaType;
  let duplicate: MediaAssetRecord | null;
  try {
    duplicate = await findDuplicateAsset(db, session, actualSha256, body.byteLength);
  } catch (error) {
    if (error instanceof ObjectStorageError) return storageUnavailableFailure();
    return persistenceFailure();
  }
  if (duplicate) {
    return completeDuplicateUpload(
      db,
      context,
      session,
      duplicate,
      auditRequestContext,
    );
  }

  const assetId = randomUUID();
  let derivatives: Awaited<ReturnType<typeof createDerivativeObjects>>;
  try {
    const storageClient = storage ?? createObjectStorage();
    derivatives = await createDerivativeObjects(storageClient, session, assetId);
  } catch {
    return persistenceFailure();
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(
        transaction,
        context.membership.organizationId,
      );
      const assignment = await findAuthorizedAssignmentForMedia(
        transaction,
        context,
        session.dispatchAssignmentId,
        "create",
      );
      if ("failure" in assignment) return assignment.failure;
      const actorFailure = await revalidateMediaActor(
        transaction,
        context,
        "create",
        session.officeId,
      );
      if (actorFailure) return actorFailure;

      const [currentSession] = await transaction
        .select()
        .from(mediaUploadSessions)
        .where(
          and(
            eq(mediaUploadSessions.id, session.id),
            eq(mediaUploadSessions.status, "pending_upload"),
          ),
        )
        .limit(1);
      if (!currentSession) return { status: "stale_update" };

      const [asset] = await transaction
        .insert(mediaAssets)
        .values({
          id: assetId,
          organizationId: session.organizationId,
          officeId: session.officeId,
          dispatchAssignmentId: session.dispatchAssignmentId,
          uploadSessionId: session.id,
          uploadedByUserId: context.user.id,
          uploadedByMembershipId: context.membership.id,
          category: session.category,
          originalFilename: session.originalFilename,
          detectedMediaType: detected,
          byteSize: body.byteLength,
          sha256: actualSha256,
          storageProvider: session.storageProvider,
          storageBucket: session.storageBucket,
          storageKey: session.storageKey,
          status: "ready",
        })
        .returning();

      const derivativeRows = await transaction
        .insert(mediaDerivatives)
        .values(derivatives.map((derivative) => ({
          ...derivative,
          organizationId: asset.organizationId,
          officeId: asset.officeId,
          mediaAssetId: asset.id,
        })))
        .returning();

      await transaction
        .update(mediaUploadSessions)
        .set({
          status: "completed",
          completedMediaAssetId: asset.id,
          updatedAt: new Date(),
        })
        .where(eq(mediaUploadSessions.id, session.id));

      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: asset.officeId,
        action: "media_upload.completed",
        outcome: "succeeded",
        target: { type: "media_asset", id: asset.id },
        secondaryTarget: { type: "dispatch_assignment", id: asset.dispatchAssignmentId },
        requestContext: auditRequestContext,
        previousState: mediaUploadAuditState(session),
        resultingState: mediaAssetAuditState(asset, derivativeRows),
        metadata: { derivativeCount: derivativeRows.length, duplicate: false },
      });

      return {
        status: "ok",
        value: mediaAssetView(asset, derivativeRows),
        duplicate: false,
        mutation: createMutationMetadata(
          "media_upload.completed",
          asset.id,
          auditEvent,
        ),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function listMediaAssetsForAssignment(
  db: OperationalDatabase,
  context: AuthorizationContext,
  assignmentId: unknown,
): Promise<ListMediaAssetsResult> {
  const parsedId = uploadSessionIdInputSchema.safeParse(assignmentId);
  if (!parsedId.success) {
    return { status: "validation_error", issues: validationIssues(parsedId.error) };
  }

  try {
    const assignment = await db.transaction(async (transaction) =>
      findAuthorizedAssignmentForMedia(
        transaction,
        context,
        parsedId.data,
        "read",
      ),
    );
    if ("failure" in assignment) return assignment.failure;

    const assets = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.organizationId, context.membership.organizationId),
          eq(mediaAssets.dispatchAssignmentId, parsedId.data),
        ),
      )
      .orderBy(mediaAssets.createdAt);
    const derivatives = assets.length
      ? await db
          .select()
          .from(mediaDerivatives)
          .where(
            and(
              eq(mediaDerivatives.organizationId, context.membership.organizationId),
              inArray(mediaDerivatives.mediaAssetId, assets.map((asset) => asset.id)),
            ),
          )
      : [];
    return {
      status: "ok",
      values: assets.map((asset) =>
        mediaAssetView(asset, derivatives.filter((item) => item.mediaAssetId === asset.id)),
      ),
    };
  } catch {
    return persistenceFailure();
  }
}

export async function createMediaReadGrant(
  db: OperationalDatabase,
  context: AuthorizationContext,
  assetId: unknown,
  variantInput: unknown,
  baseUrl: string,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<MediaReadGrantResult> {
  const parsedVariant = mediaReadVariantInputSchema.safeParse(variantInput);
  const parsedAssetId = mediaAssetIdInputSchema.safeParse(assetId);
  if (!parsedAssetId.success) {
    return { status: "validation_error", issues: validationIssues(parsedAssetId.error) };
  }
  if (!parsedVariant.success) {
    return { status: "validation_error", issues: validationIssues(parsedVariant.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      const readable = await readMediaAssetView(
        transaction,
        context,
        parsedAssetId.data,
        "read",
      );
      if (readable.status !== "ok") return readable;
      const expiresAt = new Date(Date.now() + readGrantLifetimeMs);
      const token = createStorageGrantToken({
        kind: "read",
        subjectId: parsedAssetId.data,
        variant: parsedVariant.data,
        expiresAt: expiresAt.getTime(),
      });
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: readable.asset.officeId,
        action: "media_access.granted",
        outcome: "succeeded",
        target: { type: "media_asset", id: readable.asset.id },
        secondaryTarget: { type: "dispatch_assignment", id: readable.asset.dispatchAssignmentId },
        requestContext: auditRequestContext,
        metadata: { variant: parsedVariant.data },
      });

      return {
        status: "ok",
        access: {
          url: `${baseUrl}/api/media/assets/${readable.asset.id}/content?variant=${parsedVariant.data}&token=${encodeURIComponent(token)}`,
          method: "GET",
          expiresAt: expiresAt.toISOString(),
          variant: parsedVariant.data,
        },
        mutation: createMutationMetadata(
          "media_access.granted",
          readable.asset.id,
          auditEvent,
        ),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function readGrantedMediaObject(
  db: OperationalDatabase,
  assetId: unknown,
  variantInput: unknown,
  token: string | null,
  storage?: PrivateObjectStorage,
): Promise<MediaObjectReadResult> {
  const parsedAssetId = mediaAssetIdInputSchema.safeParse(assetId);
  const parsedVariant = mediaReadVariantInputSchema.safeParse(variantInput);
  if (!parsedAssetId.success) {
    return { status: "validation_error", issues: validationIssues(parsedAssetId.error) };
  }
  if (!parsedVariant.success) {
    return { status: "validation_error", issues: validationIssues(parsedVariant.error) };
  }

  const grant = verifyReadGrant(token, parsedAssetId.data, parsedVariant.data);
  if (!grant) return notFoundOrInaccessible();

  const reference = await findStorageReferenceForVariant(
    db,
    parsedAssetId.data,
    parsedVariant.data,
  );
  if (!reference) return notFoundOrInaccessible();

  try {
    const storageClient = storage ?? createObjectStorage();
    const body = await storageClient.getObject(reference.reference);
    return {
      status: "ok",
      body,
      mediaType: reference.mediaType,
      byteSize: body.byteLength,
    };
  } catch {
    return notFoundOrInaccessible();
  }
}

async function completeDuplicateUpload(
  db: OperationalDatabase,
  context: AuthorizationContext,
  session: MediaUploadSessionRecord,
  duplicate: MediaAssetRecord,
  auditRequestContext: AuditRequestContext,
): Promise<CompleteMediaUploadResult> {
  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(
        transaction,
        context.membership.organizationId,
      );
      const assignment = await findAuthorizedAssignmentForMedia(
        transaction,
        context,
        session.dispatchAssignmentId,
        "create",
      );
      if ("failure" in assignment) return assignment.failure;
      const actorFailure = await revalidateMediaActor(
        transaction,
        context,
        "create",
        session.officeId,
      );
      if (actorFailure) return actorFailure;
      const derivativeRows = await transaction
        .select()
        .from(mediaDerivatives)
        .where(eq(mediaDerivatives.mediaAssetId, duplicate.id));
      const [updatedSession] = await transaction
        .update(mediaUploadSessions)
        .set({
          status: "completed",
          completedMediaAssetId: duplicate.id,
          duplicateOfMediaAssetId: duplicate.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mediaUploadSessions.id, session.id),
            eq(mediaUploadSessions.status, "pending_upload"),
          ),
        )
        .returning();
      if (!updatedSession) return { status: "stale_update" };
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: duplicate.officeId,
        action: "media_upload.completed",
        outcome: "succeeded",
        target: { type: "media_asset", id: duplicate.id },
        secondaryTarget: { type: "media_upload_session", id: session.id },
        requestContext: auditRequestContext,
        previousState: mediaUploadAuditState(session),
        resultingState: mediaAssetAuditState(duplicate, derivativeRows),
        metadata: { duplicate: true },
      });
      return {
        status: "ok",
        value: mediaAssetView(duplicate, derivativeRows),
        duplicate: true,
        mutation: createMutationMetadata(
          "media_upload.completed",
          duplicate.id,
          auditEvent,
        ),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

async function markUploadFailed(
  db: OperationalDatabase,
  context: AuthorizationContext,
  session: MediaUploadSessionRecord,
  reason: string,
  auditRequestContext: AuditRequestContext,
): Promise<Extract<MediaFailure, { status: "validation_error" }>> {
  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(
        transaction,
        context.membership.organizationId,
      );
      const [updatedSession] = await transaction
        .update(mediaUploadSessions)
        .set({
          status: "failed",
          failureReason: reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mediaUploadSessions.id, session.id),
            eq(mediaUploadSessions.status, "pending_upload"),
          ),
        )
        .returning();
      if (!updatedSession) {
        return {
          status: "validation_error" as const,
          issues: ["upload session is no longer pending"],
        };
      }
      const failed = { ...session, status: "failed" as const };
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: session.officeId,
        action: "media_upload.failed",
        outcome: "failed",
        target: { type: "media_upload_session", id: session.id },
        secondaryTarget: { type: "dispatch_assignment", id: session.dispatchAssignmentId },
        requestContext: auditRequestContext,
        reason,
        previousState: mediaUploadAuditState(session),
        resultingState: mediaUploadAuditState(failed),
      });
      return {
        status: "validation_error" as const,
        issues: [reason],
        mutation: createMutationMetadata(
          "media_upload.failed",
          session.id,
          auditEvent,
        ),
      };
    });
  } catch {
    return { status: "validation_error", issues: [reason] };
  }
}

async function findAuthorizedAssignmentForMedia(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  assignmentId: string,
  operation: "create" | "read",
): Promise<
  | { value: MediaAssignmentRecord }
  | { failure: MediaFailure }
> {
  const officePermission = operation === "create"
    ? "media_asset.create"
    : "media_asset.read";
  const ownPermission = operation === "create"
    ? "media_asset.create_own"
    : "media_asset.read_own";

  if (hasPermission(context, officePermission)) {
    const [assignment] = await transaction
      .select({
        id: dispatchAssignments.id,
        officeId: dispatchAssignments.officeId,
        status: dispatchAssignments.status,
      })
      .from(dispatchAssignments)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            dispatchAssignments.organizationId,
            dispatchAssignments.officeId,
          ),
          eq(dispatchAssignments.id, assignmentId),
        ),
      )
      .limit(1);
    if (!assignment) return { failure: notFoundOrInaccessible() };
    const actorFailure = await revalidateMediaActor(
      transaction,
      context,
      operation,
      assignment.officeId,
    );
    return actorFailure ? { failure: actorFailure } : { value: assignment };
  }

  if (!hasPermission(context, ownPermission)) {
    return { failure: forbidden() };
  }

  const [assignment] = await transaction
    .select({
      id: dispatchAssignments.id,
      officeId: dispatchAssignments.officeId,
      status: dispatchAssignments.status,
    })
    .from(assignmentTechnicians)
    .innerJoin(
      technicians,
      and(
        eq(assignmentTechnicians.technicianId, technicians.id),
        eq(assignmentTechnicians.organizationId, technicians.organizationId),
      ),
    )
    .innerJoin(
      dispatchAssignments,
      and(
        eq(assignmentTechnicians.dispatchAssignmentId, dispatchAssignments.id),
        eq(assignmentTechnicians.organizationId, dispatchAssignments.organizationId),
        eq(assignmentTechnicians.officeId, dispatchAssignments.officeId),
      ),
    )
    .where(
      and(
        eq(dispatchAssignments.id, assignmentId),
        eq(assignmentTechnicians.status, "active"),
        eq(technicians.organizationMembershipId, context.membership.id),
        operationalRecordScopePredicate(
          context.tenantScope,
          dispatchAssignments.organizationId,
          dispatchAssignments.officeId,
        ),
      ),
    )
    .limit(1);

  if (!assignment) return { failure: notFoundOrInaccessible() };
  const actorFailure = await revalidateMediaActor(
    transaction,
    context,
    operation,
    assignment.officeId,
  );
  return actorFailure ? { failure: actorFailure } : { value: assignment };
}

async function revalidateMediaActor(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  operation: "create" | "read",
  officeId: string,
): Promise<OperationalRecordFailure | null> {
  const officePermission = operation === "create"
    ? "media_asset.create"
    : "media_asset.read";
  const ownPermission = operation === "create"
    ? "media_asset.create_own"
    : "media_asset.read_own";
  const permission = hasPermission(context, officePermission)
    ? officePermission
    : ownPermission;
  return revalidateOperationalActor(transaction, context, permission, officeId);
}

async function readMediaAssetView(
  db: OperationalTransaction,
  context: AuthorizationContext,
  assetId: string,
  operation: "read",
): Promise<
  | { status: "ok"; value: MediaAssetView; asset: MediaAssetRecord; derivatives: MediaDerivativeRecord[] }
  | MediaFailure
> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.organizationId, context.membership.organizationId),
      ),
    )
    .limit(1);
  if (!asset) return notFoundOrInaccessible();

  const assignment = await findAuthorizedAssignmentForMedia(
    db as OperationalTransaction,
    context,
    asset.dispatchAssignmentId,
    operation,
  );
  if ("failure" in assignment) return assignment.failure;

  const derivatives = await db
    .select()
    .from(mediaDerivatives)
    .where(eq(mediaDerivatives.mediaAssetId, asset.id));
  return {
    status: "ok",
    value: mediaAssetView(asset, derivatives),
    asset,
    derivatives,
  };
}

async function findStorageReferenceForVariant(
  db: OperationalDatabase,
  assetId: string,
  variant: MediaReadVariant,
): Promise<{ reference: StoredObjectReference; mediaType: string } | null> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId))
    .limit(1);
  if (!asset) return null;
  if (variant === "original") {
    return {
      reference: {
        provider: "local-test",
        bucket: asset.storageBucket,
        key: asset.storageKey,
      },
      mediaType: asset.detectedMediaType,
    };
  }

  const [derivative] = await db
    .select()
    .from(mediaDerivatives)
    .where(
      and(
        eq(mediaDerivatives.mediaAssetId, assetId),
        eq(mediaDerivatives.derivativeType, variant),
      ),
    )
    .limit(1);
  return derivative
    ? {
        reference: {
          provider: "local-test",
          bucket: derivative.storageBucket,
          key: derivative.storageKey,
        },
        mediaType: derivative.mediaType,
      }
    : null;
}

function uploadGrantForSession(session: MediaUploadSessionRecord): MediaUploadGrant {
  const token = session.status === "pending_upload"
    ? createStorageGrantToken({
        kind: "upload",
        subjectId: session.id,
        expiresAt: session.uploadExpiresAt.getTime(),
      })
    : null;
  return {
    uploadSessionId: session.id,
    status: session.status,
    uploadUrl: token ? createPresignedUploadUrl(session) : null,
    method: "PUT",
    expiresAt: session.uploadExpiresAt.toISOString(),
    requiredHeaders: {
      "content-type": session.declaredMediaType,
      "x-amz-meta-sha256": session.expectedSha256,
    },
    mediaAssetId: session.completedMediaAssetId,
  };
}

function createPresignedUploadUrl(session: MediaUploadSessionRecord): string {
  return createPresignedPutObjectUrl({
    reference: {
      provider: "local-test",
      bucket: session.storageBucket,
      key: session.storageKey,
    },
    contentType: session.declaredMediaType,
    sha256: session.expectedSha256,
    expiresAt: session.uploadExpiresAt,
  });
}

function verifyUploadGrant(token: string | null, uploadSessionId: string) {
  return verifyStorageGrantToken(token, {
    kind: "upload",
    subjectId: uploadSessionId,
  });
}

function verifyReadGrant(
  token: string | null,
  assetId: string,
  variant: MediaReadVariant,
) {
  return verifyStorageGrantToken(token, {
    kind: "read",
    subjectId: assetId,
    variant,
  });
}

function newUploadObjectReference(
  organizationId: string,
  assignmentId: string,
  uploadSessionId: string,
): StoredObjectReference {
  const config = getRequiredObjectStorageConfig();
  return {
    provider: "local-test",
    bucket: config.bucket,
    key: `organizations/${organizationId}/assignments/${assignmentId}/uploads/${uploadSessionId}/original`,
  };
}

async function createDerivativeObjects(
  storage: PrivateObjectStorage,
  session: MediaUploadSessionRecord,
  assetId: string,
) {
  const values = [
    { derivativeType: "preview" as const, width: 960, height: 640 },
    { derivativeType: "thumbnail" as const, width: 320, height: 240 },
  ];

  return Promise.all(values.map(async (value) => {
    const body = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${value.width}" height="${value.height}" viewBox="0 0 ${value.width} ${value.height}"><rect width="100%" height="100%" fill="#e7f4ed"/><text x="24" y="48" font-family="Arial" font-size="24" fill="#276749">${value.derivativeType}</text><text x="24" y="88" font-family="Arial" font-size="14" fill="#1b1f24">${assetId}</text></svg>`,
      "utf8",
    );
    const key = `organizations/${session.organizationId}/assignments/${session.dispatchAssignmentId}/media/${assetId}/${value.derivativeType}.svg`;
    const facts = await storage.putObject({
      provider: "local-test",
      bucket: session.storageBucket,
      key,
      body,
      contentType: "image/svg+xml",
    });

    return {
      derivativeType: value.derivativeType,
      mediaType: "image/svg+xml",
      byteSize: facts.byteSize,
      sha256: facts.sha256,
      storageProvider: session.storageProvider,
      storageBucket: session.storageBucket,
      storageKey: key,
      processorName: derivativeProcessorName,
      processorVersion: derivativeProcessorVersion,
    };
  }));
}

async function findDuplicateAsset(
  db: OperationalDatabase,
  session: MediaUploadSessionRecord,
  sha256: string,
  byteSize: number,
): Promise<MediaAssetRecord | null> {
  const [duplicate] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.organizationId, session.organizationId),
        eq(mediaAssets.dispatchAssignmentId, session.dispatchAssignmentId),
        eq(mediaAssets.sha256, sha256),
        eq(mediaAssets.byteSize, byteSize),
      ),
    )
    .limit(1);
  return duplicate ?? null;
}

function verificationFailures(
  session: MediaUploadSessionRecord,
  byteSize: number,
  sha256: string,
  inspection: MediaInspection,
): string[] {
  const issues: string[] = [];
  if (byteSize !== session.expectedByteSize) {
    issues.push("byte size does not match upload session");
  }
  if (sha256 !== session.expectedSha256) {
    issues.push("sha256 checksum does not match upload session");
  }
  if (!inspection.detectedMediaType) {
    issues.push("media type could not be verified");
  } else if (
    !declaredTypeCompatible(session.declaredMediaType, inspection.detectedMediaType)
  ) {
    issues.push("detected media type does not match declared media type");
  }
  issues.push(...mediaSafetyIssues(inspection));
  return issues;
}

function sameUploadIntent(
  session: MediaUploadSessionRecord,
  input: {
    category: string;
    originalFilename: string;
    declaredMediaType: string;
    byteSize: number;
    sha256: string;
  },
): boolean {
  return (
    session.category === input.category &&
    session.originalFilename === input.originalFilename &&
    session.declaredMediaType === input.declaredMediaType &&
    session.expectedByteSize === input.byteSize &&
    session.expectedSha256 === input.sha256
  );
}

function mediaAssetView(
  asset: MediaAssetRecord,
  derivatives: readonly MediaDerivativeRecord[],
): MediaAssetView {
  return {
    id: asset.id,
    dispatchAssignmentId: asset.dispatchAssignmentId,
    category: asset.category,
    detectedMediaType: asset.detectedMediaType,
    byteSize: asset.byteSize,
    sha256: asset.sha256,
    status: asset.status,
    createdAt: asset.createdAt.toISOString(),
    derivatives: derivatives.map((derivative) => ({
      id: derivative.id,
      derivativeType: derivative.derivativeType,
      mediaType: derivative.mediaType,
      byteSize: derivative.byteSize,
      sha256: derivative.sha256,
      createdAt: derivative.createdAt.toISOString(),
    })),
  };
}

function syntheticMutation(
  action: OperationalRecordMutationMetadata["action"],
  session: MediaUploadSessionRecord,
): OperationalRecordMutationMetadata {
  return {
    mutationId: session.completedMediaAssetId ?? session.id,
    requestId: session.id,
    correlationId: session.id,
    action,
    actorUserId: session.createdByUserId,
    organizationId: session.organizationId,
    subjectId: session.completedMediaAssetId ?? session.id,
    occurredAt: session.updatedAt.toISOString(),
  };
}
