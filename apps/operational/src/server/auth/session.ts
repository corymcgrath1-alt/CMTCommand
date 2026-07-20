import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  DEVELOPMENT_IDENTITY_PROVIDER,
  type DevelopmentAuthConfig,
} from "./runtime-config";
import type { VerifiedSession } from "./types";

const sessionPayloadSchema = z.object({
  version: z.literal(1),
  provider: z.literal(DEVELOPMENT_IDENTITY_PROVIDER),
  providerSubject: z.string().min(1).max(200),
  activeOrganizationId: z.string().uuid().optional(),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export function issueDevelopmentSession(
  config: DevelopmentAuthConfig,
  providerSubject: string,
  options: { activeOrganizationId?: string; now?: Date } = {},
): string {
  if (!config.allowedSubjects.includes(providerSubject)) {
    throw new Error("development_identity_not_allowed");
  }

  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const payload: SessionPayload = {
    version: 1,
    provider: DEVELOPMENT_IDENTITY_PROVIDER,
    providerSubject,
    activeOrganizationId: options.activeOrganizationId,
    issuedAt,
    expiresAt: issuedAt + AUTH_SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, config.secret)}`;
}
export function verifyDevelopmentSession(
  config: DevelopmentAuthConfig,
  token: string,
  now = new Date(),
): VerifiedSession | null {
  const [encodedPayload, suppliedSignature, extra] = token.split(".");

  if (!encodedPayload || !suppliedSignature || extra) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, config.secret);

  if (!safeEqual(suppliedSignature, expectedSignature)) {
    return null;
  }

  let payloadInput: unknown;

  try {
    payloadInput = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const parsed = sessionPayloadSchema.safeParse(payloadInput);

  if (!parsed.success || !config.allowedSubjects.includes(parsed.data.providerSubject)) {
    return null;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const duration = parsed.data.expiresAt - parsed.data.issuedAt;

  if (
    parsed.data.issuedAt > nowSeconds + 60 ||
    parsed.data.expiresAt <= nowSeconds ||
    duration <= 0 ||
    duration > AUTH_SESSION_MAX_AGE_SECONDS
  ) {
    return null;
  }

  return {
    identity: {
      provider: parsed.data.provider,
      providerSubject: parsed.data.providerSubject,
    },
    activeOrganizationId: parsed.data.activeOrganizationId,
  };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
