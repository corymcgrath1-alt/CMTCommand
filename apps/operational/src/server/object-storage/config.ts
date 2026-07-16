import { parseServerEnv, ServerEnvError } from "@/lib/env/server";

export const KNOWN_TEST_OBJECT_STORAGE_BUCKET = "cmtcommand-media-test";
export const DESTRUCTIVE_OBJECT_STORAGE_AUTHORIZATION =
  "ALLOW_CMT_TEST_OBJECT_STORAGE_RESET";

const allowedLoopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const unsafeStorageIdentityPattern =
  /(^|[^a-z0-9])(prod|production|pilot-production|staging)([^a-z0-9]|$)/i;

export type DisabledObjectStorageConfig = {
  mode: "disabled";
};

export type LocalTestObjectStorageConfig = {
  mode: "local-test";
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export type ObjectStorageConfig =
  | DisabledObjectStorageConfig
  | LocalTestObjectStorageConfig;

export class ObjectStorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageConfigError";
  }
}

export function getObjectStorageConfig(
  input: Record<string, string | undefined> = process.env,
): ObjectStorageConfig {
  let env: ReturnType<typeof parseServerEnv>;

  try {
    env = parseServerEnv(input);
  } catch (error) {
    if (error instanceof ServerEnvError) {
      throw new ObjectStorageConfigError(
        "Environment validation failed for object storage use.",
      );
    }

    throw error;
  }

  if (env.OBJECT_STORAGE_MODE === "disabled") {
    return { mode: "disabled" };
  }

  if (env.APP_ENV !== "test" && env.APP_ENV !== "development") {
    throw new ObjectStorageConfigError(
      "Local object storage is allowed only in development or test.",
    );
  }

  if (env.NODE_ENV === "production") {
    throw new ObjectStorageConfigError(
      "Local object storage is forbidden in a production Node runtime.",
    );
  }

  const endpoint = normalizeEndpoint(env.OBJECT_STORAGE_ENDPOINT);
  const endpointUrl = endpoint ? parseEndpoint(endpoint) : null;
  if (!endpoint || !endpointUrl) {
    throw new ObjectStorageConfigError(
      "OBJECT_STORAGE_ENDPOINT must be a valid local HTTP endpoint.",
    );
  }

  if (!["http:", "https:"].includes(endpointUrl.protocol)) {
    throw new ObjectStorageConfigError(
      "OBJECT_STORAGE_ENDPOINT must use HTTP or HTTPS.",
    );
  }

  if (!allowedLoopbackHosts.has(endpointUrl.hostname.toLowerCase())) {
    throw new ObjectStorageConfigError(
      "Local object storage endpoint must resolve to loopback.",
    );
  }

  const bucket = env.OBJECT_STORAGE_BUCKET;
  const expectedBucket = env.OBJECT_STORAGE_EXPECTED_BUCKET;
  if (!bucket || !expectedBucket || bucket !== expectedBucket) {
    throw new ObjectStorageConfigError(
      "OBJECT_STORAGE_BUCKET must exactly match OBJECT_STORAGE_EXPECTED_BUCKET.",
    );
  }

  const accessKeyId = env.OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new ObjectStorageConfigError(
      "Local object storage credentials are required.",
    );
  }

  const storageIdentity = `${endpointUrl.hostname} ${bucket} ${accessKeyId}`;
  if (unsafeStorageIdentityPattern.test(storageIdentity)) {
    throw new ObjectStorageConfigError(
      "Refusing to use unsafe-looking object storage identity.",
    );
  }

  if (env.APP_ENV === "test" && bucket !== KNOWN_TEST_OBJECT_STORAGE_BUCKET) {
    throw new ObjectStorageConfigError(
      "Test object storage must use the exact repository test bucket.",
    );
  }

  return {
    mode: "local-test",
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: env.OBJECT_STORAGE_REGION ?? "us-east-1",
  };
}

export function getRuntimeObjectStorageConfig(): ObjectStorageConfig {
  return getObjectStorageConfig(process.env);
}

export function getRequiredObjectStorageConfig(): LocalTestObjectStorageConfig {
  const config = getObjectStorageConfig();
  if (config.mode === "disabled") {
    throw new ObjectStorageConfigError("Object storage is not configured.");
  }
  return config;
}

export function assertObjectStorageCleanupAuthorized(
  config: LocalTestObjectStorageConfig,
  input: Record<string, string | undefined> = process.env,
): void {
  const endpointUrl = parseEndpoint(config.endpoint);
  if (
    config.mode !== "local-test" ||
    config.bucket !== KNOWN_TEST_OBJECT_STORAGE_BUCKET ||
    !endpointUrl ||
    !allowedLoopbackHosts.has(endpointUrl.hostname.toLowerCase())
  ) {
    throw new ObjectStorageConfigError(
      "Destructive object storage cleanup is not authorized.",
    );
  }

  if (
    input.OBJECT_STORAGE_RESET_AUTHORIZATION?.trim() !==
    DESTRUCTIVE_OBJECT_STORAGE_AUTHORIZATION
  ) {
    throw new ObjectStorageConfigError(
      "Explicit object storage cleanup authorization is required.",
    );
  }
}

function normalizeEndpoint(endpoint: string | undefined): string | null {
  if (!endpoint) return null;
  return endpoint.replace(/\/+$/, "");
}

function parseEndpoint(endpoint: string): URL | null {
  try {
    return new URL(endpoint);
  } catch {
    return null;
  }
}
