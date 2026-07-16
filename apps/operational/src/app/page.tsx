const shellStatus = [
  "Next.js App Router shell is present.",
  "TypeScript, linting, unit tests, and build commands are local to this app.",
  "Database connectivity is checked only by explicit readiness or smoke-test paths.",
  "Organization and office tenancy persistence exists server-side only.",
  "Provider-neutral identity, memberships, office access, and RBAC are implemented in the bounded operational app.",
];

const scaffoldLimitations = [
  "Production authentication remains disabled until a managed provider is selected.",
  "Development sign-in requires an explicit allowlist and signed server-only session.",
  "No imports, work orders, readiness rules, coverage workflow, Decision Log, or audit events.",
  "No deployment provider or managed database provider is configured.",
];

export default function HomePage() {
  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="intro">
        <p className="eyebrow">CMTCommand</p>
        <h1 id="page-title">Operational vNext Scaffold</h1>
        <p className="lead">
          This application boundary proves the operational toolchain without
          implementing Pilot V1 business behavior.
        </p>
      </section>

      <section className="status-grid" aria-label="Scaffold status">
        <article className="panel" aria-labelledby="shell-status-title">
          <h2 id="shell-status-title">Application Shell</h2>
          <ul>
            {shellStatus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel" aria-labelledby="access-title">
          <h2 id="access-title">Protected application</h2>
          <p className="muted">
            Access is derived from verified identity, active membership, role,
            and office assignments.
          </p>
          <a href="/sign-in">Open sign-in</a>
        </article>

        <article className="panel" aria-labelledby="health-title">
          <h2 id="health-title">Health Endpoints</h2>
          <dl className="endpoint-list">
            <div>
              <dt>
                <a href="/api/health">/api/health</a>
              </dt>
              <dd>Liveness check. Does not require PostgreSQL.</dd>
            </div>
            <div>
              <dt>
                <a href="/api/ready">/api/ready</a>
              </dt>
              <dd>Readiness check. Returns 503 until PostgreSQL is configured and reachable.</dd>
            </div>
          </dl>
        </article>

        <article className="panel panel-wide" aria-labelledby="limitations-title">
          <h2 id="limitations-title">Current Limitations</h2>
          <ul className="limitations">
            {scaffoldLimitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
