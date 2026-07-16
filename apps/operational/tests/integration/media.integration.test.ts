import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { createAuthorizationRepository } from "../../src/server/auth/repository";
import { resolveAuthorizationState } from "../../src/server/auth/resolver";
import type { AuthorizationContext } from "../../src/server/auth/types";
import { closeDatabasePool, getDatabase, type OperationalDatabase } from "../../src/server/db/client";
import {
  assignmentTechnicians,
  auditEvents,
  dispatchAssignments,
  externalIdentities,
  mediaAssets,
  mediaDerivatives,
  mediaUploadSessions,
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  projects,
  serviceTypes,
  technicians,
  users,
  workOrders,
} from "../../src/server/db/schema";
import {
  getAuthorizedTestDatabaseCleanupConfig,
  runAuthorizedTestDatabaseCleanup,
  type AuthorizedTestDatabaseCleanupConfig,
} from "../../src/server/db/test-safety";
import {
  KNOWN_TEST_OBJECT_STORAGE_BUCKET,
  DESTRUCTIVE_OBJECT_STORAGE_AUTHORIZATION,
  getObjectStorageConfig,
} from "../../src/server/object-storage/config";
import {
  LocalTestObjectStorage,
  ObjectStorageError,
  resetLocalTestObjectStorage,
  type PrivateObjectStorage,
} from "../../src/server/object-storage/storage";
import {
  beginMediaUpload,
  completeMediaUpload,
  createMediaReadGrant,
  listMediaAssetsForAssignment,
  readGrantedMediaObject,
  type CompleteMediaUploadResult,
  type MediaUploadGrant,
} from "../../src/server/media/service";
import { getPostgresErrorInfo } from "../../src/server/tenancy/errors";

let db: OperationalDatabase;
let testDatabaseConfig: AuthorizedTestDatabaseCleanupConfig;

const scheduledStartAt = new Date("2026-07-17T11:30:00.000Z");
const scheduledEndAt = new Date("2026-07-17T13:30:00.000Z");
const mediaBaseUrl = "http://127.0.0.1:3000";
const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const unavailableStorage: PrivateObjectStorage = {
  async putObject() {
    throw new ObjectStorageError("storage_unavailable");
  },
  async getObject() {
    throw new ObjectStorageError("storage_unavailable");
  },
  async headObject() {
    throw new ObjectStorageError("storage_unavailable");
  },
};

beforeAll(() => {
  configureObjectStorageEnvironment();
  testDatabaseConfig = getAuthorizedTestDatabaseCleanupConfig();
  db = getDatabase(testDatabaseConfig.databaseUrl);
});

beforeEach(async () => {
  await cleanupTestRows(db);
  await resetLocalTestObjectStorage();
});

afterAll(async () => {
  if (db) {
    await cleanupTestRows(db);
    await resetLocalTestObjectStorage();
    await closeDatabasePool();
  }
});

describe("private assignment media storage", () => {
  it("uses a private S3-compatible test bucket with authenticated operations", async () => {
    const config = getObjectStorageConfig();
    expect(config.mode).toBe("local-test");
    if (config.mode !== "local-test") throw new Error("Expected storage config");
    expect(config.bucket).toBe(KNOWN_TEST_OBJECT_STORAGE_BUCKET);
    expect(config.endpoint).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):/);

    const storage = new LocalTestObjectStorage(config);
    await storage.healthCheck();
    expect(await storage.getBucketPolicy()).toBeNull();

    const key = `storage-health/${randomUUID()}/health.png`;
    const facts = await storage.putObject({
      provider: "local-test",
      bucket: config.bucket,
      key,
      body: validPng,
      contentType: "image/png",
    });
    expect(facts).toMatchObject({
      byteSize: validPng.byteLength,
      sha256: sha256(validPng),
      contentType: "image/png",
    });
    await expect(
      storage.headObject({
        provider: "local-test",
        bucket: config.bucket,
        key,
      }),
    ).resolves.toMatchObject({
      byteSize: validPng.byteLength,
      sha256: sha256(validPng),
      contentType: "image/png",
    });
    await expect(
      storage.getObject({
        provider: "local-test",
        bucket: config.bucket,
        key,
      }),
    ).resolves.toEqual(validPng);

    const anonymousObject = await fetch(`${config.endpoint}/${config.bucket}/${key}`);
    expect([401, 403]).toContain(anonymousObject.status);
    const anonymousList = await fetch(
      `${config.endpoint}/${config.bucket}?list-type=2`,
    );
    expect([401, 403]).toContain(anonymousList.status);
  });

  it("creates verified immutable original media with separate derivatives and audit rows", async () => {
    const fixture = await seedMediaFixture(db);
    const field = await authorizedContext(
      db,
      "alpha-field",
      fixture.organizationA.id,
    );

    const completed = await uploadAndCompletePng(
      field,
      fixture.assignment.id,
      "evidence-created",
      validPng,
    );

    expect(completed.status).toBe("ok");
    if (completed.status !== "ok") throw new Error("Expected media completion");
    expect(completed.duplicate).toBe(false);
    expect(completed.value.derivatives.map((item) => item.derivativeType).sort())
      .toEqual(["preview", "thumbnail"]);
    expect(JSON.stringify(completed.value)).not.toContain("storage");
    expect(JSON.stringify(completed.value)).not.toContain("ticket.png");

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, completed.value.id))
      .limit(1);
    const derivatives = await db
      .select()
      .from(mediaDerivatives)
      .where(eq(mediaDerivatives.mediaAssetId, completed.value.id));

    expect(asset).toMatchObject({
      dispatchAssignmentId: fixture.assignment.id,
      detectedMediaType: "image/png",
      byteSize: validPng.byteLength,
      sha256: sha256(validPng),
      status: "ready",
    });
    expect(derivatives).toHaveLength(2);
    expect(new Set(derivatives.map((item) => item.derivativeType))).toEqual(
      new Set(["preview", "thumbnail"]),
    );
    expect(derivatives.map((item) => item.storageKey)).not.toContain(
      asset.storageKey,
    );

    const listed = await listMediaAssetsForAssignment(
      db,
      field,
      fixture.assignment.id,
    );
    expect(listed.status).toBe("ok");
    if (listed.status === "ok") expect(listed.values).toHaveLength(1);

    const readGrant = await createMediaReadGrant(
      db,
      field,
      completed.value.id,
      "thumbnail",
      mediaBaseUrl,
    );
    expect(readGrant.status).toBe("ok");
    if (readGrant.status !== "ok") throw new Error("Expected read grant");
    expect(readGrant.access.url).toContain("/api/media/assets/");

    const content = await readGrantedMediaObject(
      db,
      completed.value.id,
      "thumbnail",
      new URL(readGrant.access.url).searchParams.get("token"),
    );
    expect(content.status).toBe("ok");
    if (content.status === "ok") {
      expect(content.mediaType).toBe("image/svg+xml");
      expect(content.body.toString("utf8")).toContain("thumbnail");
    }

    const unauthenticatedRead = await readGrantedMediaObject(
      db,
      completed.value.id,
      "thumbnail",
      null,
    );
    expect(unauthenticatedRead.status).toBe("not_found_or_inaccessible");

    const mediaAudits = await db
      .select()
      .from(auditEvents)
      .where(
        inArray(auditEvents.action, [
          "media_upload.initiated",
          "media_upload.completed",
          "media_access.granted",
        ]),
      );
    expect(mediaAudits.map((event) => event.action).sort()).toEqual([
      "media_access.granted",
      "media_upload.completed",
      "media_upload.initiated",
    ]);
    for (const event of mediaAudits) {
      expect(event.category).toBe("media_asset");
      expect(JSON.stringify(event.resultingState ?? {})).not.toMatch(
        /storage|ticket\.png|uploadUrl|token/i,
      );
      expect(JSON.stringify(event.metadata ?? {})).not.toMatch(
        /storage|uploadUrl|token/i,
      );
    }

    await expectAppendOnlyTrigger(() =>
      db.update(mediaAssets).set({ status: "processing_failed" }).where(
        eq(mediaAssets.id, completed.value.id),
      ),
    );
    await expectAppendOnlyTrigger(() =>
      db.update(mediaDerivatives).set({ processorVersion: "2" }).where(
        eq(mediaDerivatives.id, derivatives[0].id),
      ),
    );
    await expectAppendOnlyTrigger(() =>
      db.delete(mediaDerivatives).where(eq(mediaDerivatives.id, derivatives[0].id)),
    );
  });

  it("enforces idempotency and duplicate detection per assignment", async () => {
    const fixture = await seedMediaFixture(db);
    const field = await authorizedContext(
      db,
      "alpha-field",
      fixture.organizationA.id,
    );
    const input = uploadInput(fixture.assignment.id, "same-key", validPng);

    const firstBegin = await beginMediaUpload(db, field, input);
    const secondBegin = await beginMediaUpload(db, field, input);
    expect(firstBegin.status).toBe("created");
    expect(secondBegin.status).toBe("ok");
    if (firstBegin.status !== "created" || secondBegin.status !== "ok") {
      throw new Error("Expected idempotent upload session reuse");
    }
    expect(secondBegin.upload.uploadSessionId).toBe(
      firstBegin.upload.uploadSessionId,
    );

    const conflict = await beginMediaUpload(
      db,
      field,
      { ...input, sha256: sha256(Buffer.from("different")) },
    );
    expect(conflict).toEqual({
      status: "conflict",
      reason: "idempotency_key_reused",
    });

    await putUploadObject(firstBegin.upload, validPng);
    const firstComplete = await completeMediaUpload(
      db,
      field,
      firstBegin.upload.uploadSessionId,
    );
    expect(firstComplete.status).toBe("ok");
    if (firstComplete.status !== "ok") throw new Error("Expected first upload");

    const duplicateBegin = await beginMediaUpload(
      db,
      field,
      uploadInput(fixture.assignment.id, "second-key", validPng),
    );
    expect(duplicateBegin.status).toBe("created");
    if (duplicateBegin.status !== "created") {
      throw new Error("Expected second upload session");
    }
    await putUploadObject(duplicateBegin.upload, validPng);
    const duplicateComplete = await completeMediaUpload(
      db,
      field,
      duplicateBegin.upload.uploadSessionId,
    );

    expect(duplicateComplete.status).toBe("ok");
    if (duplicateComplete.status === "ok") {
      expect(duplicateComplete.duplicate).toBe(true);
      expect(duplicateComplete.value.id).toBe(firstComplete.value.id);
    }

    const storedAssets = await db.select().from(mediaAssets);
    const storedSessions = await db.select().from(mediaUploadSessions);
    expect(storedAssets).toHaveLength(1);
    expect(storedSessions).toHaveLength(2);
    expect(storedSessions.filter((session) => session.duplicateOfMediaAssetId))
      .toHaveLength(1);
  });

  it("fails completion when server-side size, checksum, and media type verification disagree", async () => {
    const fixture = await seedMediaFixture(db);
    const field = await authorizedContext(
      db,
      "alpha-field",
      fixture.organizationA.id,
    );
    const begin = await beginMediaUpload(
      db,
      field,
      uploadInput(fixture.assignment.id, "invalid-body", validPng),
    );
    expect(begin.status).toBe("created");
    if (begin.status !== "created") throw new Error("Expected upload session");

    await putUploadObject(begin.upload, Buffer.from("not a verified image"));
    const completed = await completeMediaUpload(
      db,
      field,
      begin.upload.uploadSessionId,
    );

    expect(completed.status).toBe("validation_error");
    if (completed.status === "validation_error") {
      expect(completed.issues.join(" ")).toMatch(/byte size/i);
      expect(completed.issues.join(" ")).toMatch(/sha256/i);
      expect(completed.issues.join(" ")).toMatch(/media type/i);
      expect("mutation" in completed ? completed.mutation?.action : undefined)
        .toBe("media_upload.failed");
    }

    const [session] = await db
      .select()
      .from(mediaUploadSessions)
      .where(eq(mediaUploadSessions.id, begin.upload.uploadSessionId));
    expect(session.status).toBe("failed");
    expect(session.failureReason).toMatch(/sha256|media type/i);
    expect(await db.select().from(mediaAssets)).toHaveLength(0);

    const failedAudits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, "media_upload.failed"));
    expect(failedAudits).toHaveLength(1);
  });

  it("keeps upload completion retryable when object storage is unavailable", async () => {
    const fixture = await seedMediaFixture(db);
    const field = await authorizedContext(
      db,
      "alpha-field",
      fixture.organizationA.id,
    );
    const begin = await beginMediaUpload(
      db,
      field,
      uploadInput(fixture.assignment.id, "storage-unavailable", validPng),
    );
    expect(begin.status).toBe("created");
    if (begin.status !== "created") throw new Error("Expected upload session");

    const completed = await completeMediaUpload(
      db,
      field,
      begin.upload.uploadSessionId,
      undefined,
      unavailableStorage,
    );

    expect(completed).toEqual({
      status: "persistence_error",
      reason: "storage_unavailable",
    });

    const [session] = await db
      .select()
      .from(mediaUploadSessions)
      .where(eq(mediaUploadSessions.id, begin.upload.uploadSessionId));
    expect(session.status).toBe("pending_upload");
    expect(session.failureReason).toBeNull();
    expect(await db.select().from(mediaAssets)).toHaveLength(0);
    expect(
      await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.action, "media_upload.failed")),
    ).toHaveLength(0);
  });

  it("requires explicit assignment media permission and tenant scope", async () => {
    const fixture = await seedMediaFixture(db);
    const field = await authorizedContext(
      db,
      "alpha-field",
      fixture.organizationA.id,
    );
    const viewer = await authorizedContext(
      db,
      "alpha-viewer",
      fixture.organizationA.id,
    );
    const betaAdmin = await authorizedContext(
      db,
      "beta-admin",
      fixture.organizationB.id,
    );

    const completed = await uploadAndCompletePng(
      field,
      fixture.assignment.id,
      "auth-check",
      validPng,
    );
    expect(completed.status).toBe("ok");
    if (completed.status !== "ok") throw new Error("Expected media upload");

    expect(await listMediaAssetsForAssignment(db, viewer, fixture.assignment.id))
      .toMatchObject({ status: "forbidden" });
    expect(
      await beginMediaUpload(
        db,
        viewer,
        uploadInput(fixture.assignment.id, "viewer-denied", validPng),
      ),
    ).toMatchObject({ status: "forbidden" });
    expect(
      await listMediaAssetsForAssignment(db, betaAdmin, fixture.assignment.id),
    ).toEqual({ status: "not_found_or_inaccessible" });
    expect(
      await createMediaReadGrant(
        db,
        betaAdmin,
        completed.value.id,
        "original",
        mediaBaseUrl,
      ),
    ).toEqual({ status: "not_found_or_inaccessible" });
  });
});

function configureObjectStorageEnvironment(): void {
  process.env.APP_ENV = "test";
  process.env.OBJECT_STORAGE_MODE = "local-test";
  process.env.OBJECT_STORAGE_ENDPOINT ??= "http://127.0.0.1:59000";
  process.env.OBJECT_STORAGE_BUCKET = KNOWN_TEST_OBJECT_STORAGE_BUCKET;
  process.env.OBJECT_STORAGE_EXPECTED_BUCKET = KNOWN_TEST_OBJECT_STORAGE_BUCKET;
  process.env.OBJECT_STORAGE_REGION ??= "us-east-1";
  process.env.OBJECT_STORAGE_RESET_AUTHORIZATION =
    DESTRUCTIVE_OBJECT_STORAGE_AUTHORIZATION;
  process.env.AUTH_SESSION_SECRET ??= "integration-object-storage-secret-32";
}

async function uploadAndCompletePng(
  context: AuthorizationContext,
  assignmentId: string,
  idempotencyKey: string,
  body: Buffer,
): Promise<CompleteMediaUploadResult> {
  const begin = await beginMediaUpload(
    db,
    context,
    uploadInput(assignmentId, idempotencyKey, body),
  );
  expect(begin.status).toBe("created");
  if (begin.status !== "created") throw new Error("Expected upload session");

  await putUploadObject(begin.upload, body);
  return completeMediaUpload(db, context, begin.upload.uploadSessionId);
}

async function putUploadObject(
  upload: MediaUploadGrant,
  body: Buffer,
): Promise<void> {
  expect(upload.uploadUrl).toBeTruthy();
  const response = await fetch(upload.uploadUrl ?? mediaBaseUrl, {
    method: "PUT",
    headers: upload.requiredHeaders,
    body: toArrayBuffer(body),
  });
  expect(response.status).toBe(200);
}

function toArrayBuffer(body: Buffer): ArrayBuffer {
  const copy = new ArrayBuffer(body.byteLength);
  new Uint8Array(copy).set(body);
  return copy;
}

function uploadInput(
  assignmentId: string,
  idempotencyKey: string,
  body: Buffer,
) {
  return {
    assignmentId,
    category: "general_photo",
    originalFilename: "ticket.png",
    declaredMediaType: "image/png",
    byteSize: body.byteLength,
    sha256: sha256(body),
    idempotencyKey,
  };
}

function sha256(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

async function expectAppendOnlyTrigger(
  operation: () => Promise<unknown>,
): Promise<void> {
  expect(getPostgresErrorInfo(await captureDatabaseError(operation))).toMatchObject({
    code: "55000",
  });
}

async function captureDatabaseError(
  operation: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await operation();
  } catch (error) {
    return error;
  }

  throw new Error("Expected database operation to fail.");
}

async function seedMediaFixture(database: OperationalDatabase) {
  const [organizationA, organizationB] = await database
    .insert(organizations)
    .values([
      { slug: "media-alpha", name: "Media Alpha" },
      { slug: "media-beta", name: "Media Beta" },
    ])
    .returning();
  const [alphaOffice, betaOffice] = await database
    .insert(offices)
    .values([
      {
        organizationId: organizationA.id,
        code: "ALX",
        name: "Alexandria",
        timeZone: "America/New_York",
      },
      {
        organizationId: organizationB.id,
        code: "BET",
        name: "Bethesda",
        timeZone: "America/New_York",
      },
    ])
    .returning();
  const [alphaAdmin, alphaField, alphaViewer, betaAdmin] = await database
    .insert(users)
    .values([
      userValues("media-alpha-admin@example.test", "Media Alpha Admin"),
      userValues("media-alpha-field@example.test", "Media Alpha Field"),
      userValues("media-alpha-viewer@example.test", "Media Alpha Viewer"),
      userValues("media-beta-admin@example.test", "Media Beta Admin"),
    ])
    .returning();
  const [alphaAdminMembership, alphaFieldMembership, alphaViewerMembership, betaAdminMembership] =
    await database
      .insert(organizationMemberships)
      .values([
        membershipValues(
          organizationA.id,
          alphaAdmin.id,
          "organization_admin",
          "all",
          alphaAdmin.id,
        ),
        membershipValues(
          organizationA.id,
          alphaField.id,
          "field_technician",
          "restricted",
          alphaAdmin.id,
        ),
        membershipValues(
          organizationA.id,
          alphaViewer.id,
          "viewer",
          "all",
          alphaAdmin.id,
        ),
        membershipValues(
          organizationB.id,
          betaAdmin.id,
          "organization_admin",
          "all",
          betaAdmin.id,
        ),
      ])
      .returning();

  await database.insert(officeAssignments).values({
    organizationId: organizationA.id,
    organizationMembershipId: alphaFieldMembership.id,
    officeId: alphaOffice.id,
    createdByUserId: alphaAdmin.id,
  });
  await database.insert(externalIdentities).values([
    identityValues(alphaAdmin.id, "alpha-admin"),
    identityValues(alphaField.id, "alpha-field"),
    identityValues(alphaViewer.id, "alpha-viewer"),
    identityValues(betaAdmin.id, "beta-admin"),
  ]);

  const [serviceType] = await database
    .insert(serviceTypes)
    .values({
      organizationId: organizationA.id,
      officeId: alphaOffice.id,
      key: "media_concrete",
      name: "Concrete Testing",
      category: "concrete",
      createdByUserId: alphaAdmin.id,
      updatedByUserId: alphaAdmin.id,
    })
    .returning();
  const [project] = await database
    .insert(projects)
    .values({
      organizationId: organizationA.id,
      officeId: alphaOffice.id,
      sourceSystem: "media.fixture",
      sourceProjectId: randomUUID(),
      projectNumber: "MEDIA-001",
      name: "Media project",
    })
    .returning();
  const [technician] = await database
    .insert(technicians)
    .values({
      organizationId: organizationA.id,
      officeId: alphaOffice.id,
      homeOfficeId: alphaOffice.id,
      sourceSystem: "media.fixture",
      sourceTechnicianId: randomUUID(),
      displayName: "Media Field",
      organizationMembershipId: alphaFieldMembership.id,
    })
    .returning();
  const [workOrder] = await database
    .insert(workOrders)
    .values({
      organizationId: organizationA.id,
      officeId: alphaOffice.id,
      projectId: project.id,
      serviceTypeId: serviceType.id,
      sourceSystem: "media.fixture",
      sourceWorkOrderId: randomUUID(),
      workOrderNumber: "MEDIA-WO-001",
      serviceType: "Concrete Testing",
      jobSiteName: "Media job site",
      status: "scheduled",
      scheduledStartAt,
      scheduledEndAt,
    })
    .returning();
  const [assignment] = await database
    .insert(dispatchAssignments)
    .values({
      organizationId: organizationA.id,
      officeId: alphaOffice.id,
      sourceSystem: "media.fixture",
      sourceAssignmentId: randomUUID(),
      workOrderId: workOrder.id,
      technicianId: technician.id,
      assignmentStartAt: scheduledStartAt,
      assignmentEndAt: scheduledEndAt,
      createdByUserId: alphaAdmin.id,
      updatedByUserId: alphaAdmin.id,
      status: "assigned",
    })
    .returning();
  await database.insert(assignmentTechnicians).values({
    organizationId: organizationA.id,
    officeId: alphaOffice.id,
    dispatchAssignmentId: assignment.id,
    technicianId: technician.id,
    role: "primary",
    assignedByUserId: alphaAdmin.id,
  });

  return {
    organizationA,
    organizationB,
    alphaOffice,
    betaOffice,
    alphaAdmin,
    alphaField,
    alphaViewer,
    betaAdmin,
    alphaAdminMembership,
    alphaFieldMembership,
    alphaViewerMembership,
    betaAdminMembership,
    assignment,
  };
}

function userValues(email: string, displayName: string) {
  return {
    email,
    normalizedEmail: email,
    displayName,
    status: "active" as const,
  };
}

function membershipValues(
  organizationId: string,
  userId: string,
  role: "organization_admin" | "field_technician" | "viewer",
  officeAccess: "all" | "restricted",
  actorUserId: string,
) {
  return {
    organizationId,
    userId,
    role,
    status: "active" as const,
    officeAccess,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
  };
}

function identityValues(userId: string, providerSubject: string) {
  return {
    userId,
    provider: "cmtcommand-development",
    providerSubject,
  };
}

async function authorizedContext(
  database: OperationalDatabase,
  subject: string,
  organizationId: string,
): Promise<AuthorizationContext> {
  const state = await resolveAuthorizationState(
    createAuthorizationRepository(database),
    {
      identity: {
        provider: "cmtcommand-development",
        providerSubject: subject,
      },
      activeOrganizationId: organizationId,
    },
  );

  if (state.status !== "authorized") {
    throw new Error("Expected authorized fixture, received " + state.status + ".");
  }

  return state.context;
}

async function cleanupTestRows(database: OperationalDatabase): Promise<void> {
  await database.transaction(async (transaction) => {
    await runAuthorizedTestDatabaseCleanup(
      testDatabaseConfig,
      async () => {
        const result = await transaction.execute<{ database_name: string }>(sql`
          select current_database()::text as database_name
        `);

        return result.rows[0]?.database_name;
      },
      async () => {
        await transaction.execute(
          sql`truncate table
            "media_derivatives",
            "media_assets",
            "media_upload_sessions",
            "audit_events",
            "assignment_events",
            "assignment_technicians",
            "dispatch_assignments",
            "work_orders",
            "technician_office_eligibilities",
            "service_types",
            "technicians",
            "projects",
            "office_assignments",
            "external_identities",
            "organization_memberships",
            "users",
            "offices",
            "organizations"
            restart identity restrict`,
        );
      },
    );
  });
}
