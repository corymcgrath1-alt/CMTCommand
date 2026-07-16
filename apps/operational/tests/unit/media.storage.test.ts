import { describe, expect, it } from "vitest";
import {
  DESTRUCTIVE_OBJECT_STORAGE_AUTHORIZATION,
  KNOWN_TEST_OBJECT_STORAGE_BUCKET,
  ObjectStorageConfigError,
  assertObjectStorageCleanupAuthorized,
  getObjectStorageConfig,
} from "../../src/server/object-storage/config";
import {
  createStorageGrantToken,
  verifyStorageGrantToken,
} from "../../src/server/object-storage/storage";
import {
  detectMediaType,
  inspectMedia,
  mediaSafetyIssues,
} from "../../src/server/media/media-type";
import { beginMediaUploadInputSchema } from "../../src/server/media/validation";

const unitAccessKey = ["unit", "test", "object", "storage", "access"].join("-");
const unitSecretKey = ["unit", "test", "object", "storage", "secret"].join("-");

const safeStorageEnv = {
  APP_ENV: "test",
  OBJECT_STORAGE_MODE: "local-test",
  OBJECT_STORAGE_ENDPOINT: "http://127.0.0.1:59000",
  OBJECT_STORAGE_BUCKET: KNOWN_TEST_OBJECT_STORAGE_BUCKET,
  OBJECT_STORAGE_EXPECTED_BUCKET: KNOWN_TEST_OBJECT_STORAGE_BUCKET,
  OBJECT_STORAGE_ACCESS_KEY_ID: unitAccessKey,
  OBJECT_STORAGE_SECRET_ACCESS_KEY: unitSecretKey,
  OBJECT_STORAGE_REGION: "us-east-1",
};

describe("media storage safety", () => {
  it("defaults object storage to disabled", () => {
    expect(getObjectStorageConfig({ APP_ENV: "development" })).toEqual({
      mode: "disabled",
    });
  });

  it("requires exact test bucket and loopback endpoint identity", () => {
    expect(
      getObjectStorageConfig(safeStorageEnv),
    ).toEqual({
      mode: "local-test",
      endpoint: "http://127.0.0.1:59000",
      bucket: KNOWN_TEST_OBJECT_STORAGE_BUCKET,
      accessKeyId: unitAccessKey,
      secretAccessKey: unitSecretKey,
      region: "us-east-1",
    });

    expect(() =>
      getObjectStorageConfig({
        ...safeStorageEnv,
        OBJECT_STORAGE_ENDPOINT: "https://storage.example.com",
      }),
    ).toThrow(ObjectStorageConfigError);
  });

  it("requires explicit destructive cleanup authorization", () => {
    const config = getObjectStorageConfig(safeStorageEnv);
    if (config.mode !== "local-test") throw new Error("Expected local test config");

    expect(() => assertObjectStorageCleanupAuthorized(config, {})).toThrow(
      ObjectStorageConfigError,
    );
    expect(() =>
      assertObjectStorageCleanupAuthorized(config, {
        OBJECT_STORAGE_RESET_AUTHORIZATION:
          DESTRUCTIVE_OBJECT_STORAGE_AUTHORIZATION,
      }),
    ).not.toThrow();
  });

  it("rejects ambiguous buckets and production-like runtime", () => {
    expect(() =>
      getObjectStorageConfig({
        ...safeStorageEnv,
        OBJECT_STORAGE_BUCKET: "wrong-media-test",
      }),
    ).toThrow(ObjectStorageConfigError);
    expect(() =>
      getObjectStorageConfig({
        ...safeStorageEnv,
        APP_ENV: "production",
      }),
    ).toThrow(ObjectStorageConfigError);
    expect(() =>
      getObjectStorageConfig({
        ...safeStorageEnv,
        NODE_ENV: "production",
      }),
    ).toThrow(ObjectStorageConfigError);
  });

  it("signs short-lived upload grants", () => {
    const originalSecret = process.env.AUTH_SESSION_SECRET;
    process.env.AUTH_SESSION_SECRET = "unit-test-storage-grant-secret-32";
    try {
      const token = createStorageGrantToken({
        kind: "upload",
        subjectId: "10000000-0000-4000-8000-000000000001",
        expiresAt: Date.now() + 60_000,
      });
      expect(
        verifyStorageGrantToken(token, {
          kind: "upload",
          subjectId: "10000000-0000-4000-8000-000000000001",
        }),
      ).toMatchObject({ kind: "upload" });
      expect(
        verifyStorageGrantToken(token, {
          kind: "read",
          subjectId: "10000000-0000-4000-8000-000000000001",
        }),
      ).toBeNull();
    } finally {
      if (originalSecret === undefined) {
        delete process.env.AUTH_SESSION_SECRET;
      } else {
        process.env.AUTH_SESSION_SECRET = originalSecret;
      }
    }
  });
});

describe("media validation", () => {
  it("accepts normal phone-image sized uploads above legacy attachment limits", () => {
    const parsed = beginMediaUploadInputSchema.safeParse({
      assignmentId: "10000000-0000-4000-8000-000000000001",
      category: "truck_ticket",
      originalFilename: "ticket.png",
      declaredMediaType: "image/png",
      byteSize: 3 * 1024 * 1024,
      sha256: "a".repeat(64),
      idempotencyKey: "ticket-upload-1",
    });
    expect(parsed.success).toBe(true);
  });

  it("sniffs real media bytes instead of trusting filenames", () => {
    expect(
      detectMediaType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(detectMediaType(Buffer.from("not really a png"))).toBeNull();
  });

  it("rejects unsupported declarations and excessive image dimensions", () => {
    const unsupported = beginMediaUploadInputSchema.safeParse({
      assignmentId: "10000000-0000-4000-8000-000000000001",
      category: "truck_ticket",
      originalFilename: "ticket.svg",
      declaredMediaType: "image/svg+xml",
      byteSize: 1024,
      sha256: "a".repeat(64),
      idempotencyKey: "ticket-upload-2",
    });
    expect(unsupported.success).toBe(false);

    const oversizedPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x4e, 0x21, 0x00, 0x00, 0x4e, 0x21,
    ]);
    expect(mediaSafetyIssues(inspectMedia(oversizedPng))).toContain(
      "image dimensions exceed supported safety limits",
    );
  });
});
