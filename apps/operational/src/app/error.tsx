"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell" aria-labelledby="error-title">
      <section className="panel">
        <h1 id="error-title">The scaffold could not render.</h1>
        <p>
          The error details are intentionally hidden from the browser response.
        </p>
        <button className="button" type="button" onClick={reset}>
          Retry
        </button>
      </section>
    </main>
  );
}
