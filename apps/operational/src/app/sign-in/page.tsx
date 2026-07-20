import type { Metadata } from "next";
import { getDevelopmentSignInAvailability } from "@/server/auth/request-session";
import { developmentSignInAction } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const availability = getDevelopmentSignInAvailability();
  const { error } = await searchParams;

  return (
    <main className="shell narrow-shell" aria-labelledby="sign-in-title">
      <section className="intro">
        <p className="eyebrow">Operational vNext</p>
        <h1 id="sign-in-title">Sign in</h1>
        <p className="lead">
          Production authentication is intentionally disabled until an identity
          provider is selected and approved.
        </p>
      </section>

      <section className="panel stack">
        {availability.status === "available" ? (
          <>
            <div>
              <h2>Development and test identity</h2>
              <p className="muted">
                This signed adapter is allowlisted and cannot run in a production
                runtime. It does not accept trusted identity headers.
              </p>
            </div>
            {error ? (
              <p className="notice notice-error" role="alert">
                That development identity is not allowed.
              </p>
            ) : null}
            <form action={developmentSignInAction} className="form-stack">
              <label htmlFor="subject">Allowed identity subject</label>
              <select id="subject" name="subject" required>
                {availability.subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <button className="button" type="submit">
                Continue to protected app
              </button>
            </form>
          </>
        ) : (
          <div className="stack">
            <h2>Authentication service unavailable</h2>
            <p className="muted">
              No production provider is configured. For local development, set
              the documented development-only authentication variables.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
