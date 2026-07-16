import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  AuthConfigurationError,
  getAuthRuntimeConfig,
} from "./runtime-config";
import {
  issueDevelopmentSession,
  verifyDevelopmentSession,
} from "./session";
import type { VerifiedSession } from "./types";

export type RequestSessionState =
  | { status: "unavailable"; reason: string }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: VerifiedSession };

export async function readRequestSession(): Promise<RequestSessionState> {
  try {
    const config = getAuthRuntimeConfig(getServerEnv());

    if (config.mode === "disabled") {
      return { status: "unavailable", reason: config.reason };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

    if (!token) {
      return { status: "unauthenticated" };
    }

    const session = verifyDevelopmentSession(config, token);
    return session
      ? { status: "authenticated", session }
      : { status: "unauthenticated" };
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return { status: "unavailable", reason: "authentication_misconfigured" };
    }

    return { status: "unavailable", reason: "authentication_unavailable" };
  }
}
export async function createDevelopmentSessionCookie(
  providerSubject: string,
  activeOrganizationId?: string,
): Promise<void> {
  const config = getAuthRuntimeConfig(getServerEnv());

  if (config.mode !== "development") {
    throw new AuthConfigurationError("Development authentication is not enabled.");
  }

  const token = issueDevelopmentSession(config, providerSubject, {
    activeOrganizationId,
  });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getServerEnv().NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });
}

export async function replaceActiveOrganizationCookie(
  activeOrganizationId: string,
): Promise<boolean> {
  const current = await readRequestSession();

  if (current.status !== "authenticated") {
    return false;
  }

  await createDevelopmentSessionCookie(
    current.session.identity.providerSubject,
    activeOrganizationId,
  );
  return true;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export function getDevelopmentSignInAvailability():
  | { status: "available"; subjects: string[] }
  | { status: "unavailable"; reason: string } {
  try {
    const config = getAuthRuntimeConfig(getServerEnv());

    return config.mode === "development"
      ? { status: "available", subjects: config.allowedSubjects }
      : { status: "unavailable", reason: config.reason };
  } catch (error) {
    return {
      status: "unavailable",
      reason:
        error instanceof AuthConfigurationError
          ? "authentication_misconfigured"
          : "authentication_unavailable",
    };
  }
}
