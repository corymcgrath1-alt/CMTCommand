"use server";

import { redirect } from "next/navigation";
import {
  createDevelopmentSessionCookie,
  getDevelopmentSignInAvailability,
} from "@/server/auth/request-session";

export async function developmentSignInAction(formData: FormData): Promise<void> {
  const subject = formData.get("subject");
  const availability = getDevelopmentSignInAvailability();

  if (
    availability.status !== "available" ||
    typeof subject !== "string" ||
    !availability.subjects.includes(subject)
  ) {
    redirect("/sign-in?error=identity_not_allowed");
  }

  await createDevelopmentSessionCookie(subject);
  redirect("/app");
}
