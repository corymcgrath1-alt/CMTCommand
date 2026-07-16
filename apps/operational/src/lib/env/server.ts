import { z } from "zod";

const appEnvironmentSchema = z.enum([
  "development",
  "test",
  "staging",
  "pilot-production",
  "production",
]);

const nodeEnvironmentSchema = z.enum(["development", "test", "production"]);

const authModeSchema = z.enum(["disabled", "development"]);
const objectStorageModeSchema = z.enum(["disabled", "local-test"]);

const optionalTrimmedStringSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const optionalPostgresUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "must be a PostgreSQL connection string",
    )
    .optional(),
);

const serverEnvSchema = z
  .object({
    APP_ENV: appEnvironmentSchema.default("development"),
    NODE_ENV: nodeEnvironmentSchema.optional(),
    DATABASE_URL: optionalPostgresUrlSchema,
    TEST_DATABASE_URL: optionalPostgresUrlSchema,
    AUTH_MODE: authModeSchema.default("disabled"),
    AUTH_SESSION_SECRET: optionalTrimmedStringSchema,
    AUTH_DEVELOPMENT_SUBJECTS: optionalTrimmedStringSchema,
    OBJECT_STORAGE_MODE: objectStorageModeSchema.default("disabled"),
    OBJECT_STORAGE_ENDPOINT: optionalTrimmedStringSchema,
    OBJECT_STORAGE_BUCKET: optionalTrimmedStringSchema,
    OBJECT_STORAGE_EXPECTED_BUCKET: optionalTrimmedStringSchema,
    OBJECT_STORAGE_ACCESS_KEY_ID: optionalTrimmedStringSchema,
    OBJECT_STORAGE_SECRET_ACCESS_KEY: optionalTrimmedStringSchema,
    OBJECT_STORAGE_REGION: optionalTrimmedStringSchema,
    OBJECT_STORAGE_RESET_AUTHORIZATION: optionalTrimmedStringSchema,
  })
  .passthrough();

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

export type ServerEnv = {
  APP_ENV: AppEnvironment;
  NODE_ENV?: "development" | "test" | "production";
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
  AUTH_MODE: "disabled" | "development";
  AUTH_SESSION_SECRET?: string;
  AUTH_DEVELOPMENT_SUBJECTS?: string;
  OBJECT_STORAGE_MODE: "disabled" | "local-test";
  OBJECT_STORAGE_ENDPOINT?: string;
  OBJECT_STORAGE_BUCKET?: string;
  OBJECT_STORAGE_EXPECTED_BUCKET?: string;
  OBJECT_STORAGE_ACCESS_KEY_ID?: string;
  OBJECT_STORAGE_SECRET_ACCESS_KEY?: string;
  OBJECT_STORAGE_REGION?: string;
  OBJECT_STORAGE_RESET_AUTHORIZATION?: string;
};

export class ServerEnvError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Server environment validation failed");
    this.name = "ServerEnvError";
    this.issues = issues;
  }
}

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new ServerEnvError(
      parsed.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "environment";
        return `${path}: ${issue.message}`;
      }),
    );
  }

  return {
    APP_ENV: parsed.data.APP_ENV,
    NODE_ENV: parsed.data.NODE_ENV,
    DATABASE_URL: parsed.data.DATABASE_URL,
    TEST_DATABASE_URL: parsed.data.TEST_DATABASE_URL,
    AUTH_MODE: parsed.data.AUTH_MODE,
    AUTH_SESSION_SECRET: parsed.data.AUTH_SESSION_SECRET,
    AUTH_DEVELOPMENT_SUBJECTS: parsed.data.AUTH_DEVELOPMENT_SUBJECTS,
    OBJECT_STORAGE_MODE: parsed.data.OBJECT_STORAGE_MODE,
    OBJECT_STORAGE_ENDPOINT: parsed.data.OBJECT_STORAGE_ENDPOINT,
    OBJECT_STORAGE_BUCKET: parsed.data.OBJECT_STORAGE_BUCKET,
    OBJECT_STORAGE_EXPECTED_BUCKET: parsed.data.OBJECT_STORAGE_EXPECTED_BUCKET,
    OBJECT_STORAGE_ACCESS_KEY_ID: parsed.data.OBJECT_STORAGE_ACCESS_KEY_ID,
    OBJECT_STORAGE_SECRET_ACCESS_KEY:
      parsed.data.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    OBJECT_STORAGE_REGION: parsed.data.OBJECT_STORAGE_REGION,
    OBJECT_STORAGE_RESET_AUTHORIZATION:
      parsed.data.OBJECT_STORAGE_RESET_AUTHORIZATION,
  };
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
