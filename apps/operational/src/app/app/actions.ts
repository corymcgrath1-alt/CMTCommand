"use server";

import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env/server";
import { getDatabase } from "@/server/db/client";
import { createAuthorizationRepository } from "@/server/auth/repository";
import {
  clearSessionCookie,
  readRequestSession,
  replaceActiveOrganizationCookie,
} from "@/server/auth/request-session";
import { resolveAuthorizationState } from "@/server/auth/resolver";
import { uuidInputSchema } from "@/server/tenancy/validation";

export async function selectActiveOrganizationAction(
  formData: FormData,
): Promise<void> {
  const organizationId = formData.get("organizationId");
  const parsedOrganizationId = uuidInputSchema.safeParse(organizationId);
  const sessionState = await readRequestSession();
  const env = getServerEnv();

  if (
    !parsedOrganizationId.success ||
    sessionState.status !== "authenticated" ||
    !env.DATABASE_URL
  ) {
    redirect("/app?access=organization_selection_rejected");
  }

  let state;

  try {
    state = await resolveAuthorizationState(
      createAuthorizationRepository(getDatabase(env.DATABASE_URL)),
      {
        ...sessionState.session,
        activeOrganizationId: parsedOrganizationId.data,
      },
    );
  } catch {
    redirect("/app?access=organization_selection_unavailable");
  }

  if (
    state.status !== "authorized" ||
    state.context.membership.organizationId !== parsedOrganizationId.data
  ) {
    redirect("/app?access=organization_selection_rejected");
  }

  const changed = await replaceActiveOrganizationCookie(parsedOrganizationId.data);

  if (!changed) {
    redirect("/sign-in");
  }

  redirect("/app");
}

export async function clearActiveOrganizationAction(): Promise<void> {
  const sessionState = await readRequestSession();

  if (sessionState.status !== "authenticated") {
    redirect("/sign-in");
  }

  const { createDevelopmentSessionCookie } = await import(
    "@/server/auth/request-session"
  );
  await createDevelopmentSessionCookie(
    sessionState.session.identity.providerSubject,
  );
  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/sign-in");
}
