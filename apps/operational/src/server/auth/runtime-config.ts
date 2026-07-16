import type { ServerEnv } from "@/lib/env/server";

export const DEVELOPMENT_IDENTITY_PROVIDER = "cmtcommand-development";
export const AUTH_SESSION_COOKIE = "cmtcommand-operational-session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type DevelopmentAuthConfig = {
  mode: "development";
  secret: string;
  allowedSubjects: string[];
};

export type DisabledAuthConfig = {
  mode: "disabled";
  reason: "provider_not_selected";
};

export type AuthRuntimeConfig = DevelopmentAuthConfig | DisabledAuthConfig;

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}
export function getAuthRuntimeConfig(env: ServerEnv): AuthRuntimeConfig {
  if (env.AUTH_MODE === "disabled") {
    return { mode: "disabled", reason: "provider_not_selected" };
  }

  if (
    !["development", "test"].includes(env.APP_ENV) ||
    env.NODE_ENV === "production"
  ) {
    throw new AuthConfigurationError(
      "Development authentication is forbidden outside development and test runtimes.",
    );
  }

  if (!env.AUTH_SESSION_SECRET || env.AUTH_SESSION_SECRET.length < 32) {
    throw new AuthConfigurationError(
      "AUTH_SESSION_SECRET must contain at least 32 characters for development authentication.",
    );
  }

  const allowedSubjects = [
    ...new Set(
      (env.AUTH_DEVELOPMENT_SUBJECTS ?? "")
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean),
    ),
  ];

  if (allowedSubjects.length === 0) {
    throw new AuthConfigurationError(
      "AUTH_DEVELOPMENT_SUBJECTS must explicitly allow at least one subject.",
    );
  }

  return {
    mode: "development",
    secret: env.AUTH_SESSION_SECRET,
    allowedSubjects,
  };
}
