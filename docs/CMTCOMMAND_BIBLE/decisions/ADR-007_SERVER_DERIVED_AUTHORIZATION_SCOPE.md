# ADR-007 Server-Derived Authorization Scope

## Document Status

- Status: Accepted for Phase 5D
- Date: 2026-07-15
- Extends: [ADR-004 Tenancy Authorization And Audit Model](ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md)
- Primary Evidence:
  - `apps/operational/src/server/auth/`
  - `apps/operational/src/server/members/`
  - `apps/operational/src/server/db/schema/`
  - `apps/operational/drizzle/0001_office-composite-key.sql`
  - `apps/operational/drizzle/0002_identity-membership-rbac.sql`
  - `apps/operational/tests/unit/auth.*.test.ts`
  - `apps/operational/tests/integration/identity.integration.test.ts`

## Decision

Authorization scope is derived server-side from a verified external identity and
current application database state. The request path is:

```text
Verified provider identity
    -> CMTCommand application user
    -> active organization membership
    -> authorized office scope
    -> derived permissions
    -> tenant-scoped service/repository operation
```

Browser-supplied organization IDs, office IDs, roles, and permissions are
untrusted input. A browser value may identify a requested resource or desired
organization selection, but the server must independently validate it against
the current user, membership, organization, role, status, and office assignments.

## Authentication Provider Boundary

No production provider is selected. Phase 5D therefore implements a
provider-neutral `(provider, provider_subject)` mapping and keeps production
authentication disabled. Provider subject, not email, is the stable external
identity key.

The development/test adapter is a bounded exception:

- It is server-only and accepts only explicitly allowlisted subjects.
- It signs an `HttpOnly`, `SameSite=Lax` cookie with HMAC-SHA256.
- It is rejected in staging, pilot-production, production, or a production Node
  runtime.
- It accepts no identity, role, organization, or office headers.
- It does not provision unknown identities automatically.
- It stores no provider access or refresh token.

A future production provider must verify issuer, audience, signature,
expiration, and state/nonce as applicable before creating the same
`VerifiedExternalIdentity` boundary.

## Application Authorization Model

Application users are distinct from external identities. A user can have
memberships in multiple organizations, but only one active organization is used
for a request. The optional organization selection is stored in the signed
session and revalidated against active memberships on every request.

Authorization requires:

- Active application user.
- Active organization.
- Active organization membership.
- Server-derived permissions for the database role.
- Valid `all` or `restricted` office policy for that role.
- Assigned office for office-restricted operations.

Invited, suspended, revoked, disabled, unknown, unaffiliated, and invalid-policy
states fail closed.

## Role And Office Policy

Phase 5D roles are `organization_admin`, `operations_manager`, `dispatcher`,
`technical_reviewer`, `field_technician`, and `viewer`.

Only `organization_admin` has membership, role, and office-assignment management
permissions. Dispatcher and field-technician memberships must be office
restricted. Organization admin, operations manager, technical reviewer, and
viewer may use an explicit organization-wide office policy. Viewer remains
read-only.

These permissions cover only the identity/RBAC foundation. They do not imply
implemented readiness, coverage, work-order, assignment, field-reporting, or
technical-approval capabilities.

## Mutation Safety

Membership and office-assignment mutations:

- Receive the authenticated actor context from the server boundary.
- Revalidate the actor's user, organization, membership status, and current role
  inside the database transaction.
- Lock the organization row to serialize admin-sensitive changes.
- Use a membership version for optimistic concurrency.
- Prohibit self role/status changes.
- Prevent final active-admin lockout.
- Enforce same-organization office assignment with composite foreign keys.
- Return structured actor, organization, action, subject, mutation, and timestamp
  metadata for a future persistent audit sink.

The metadata is not a persistent audit log. A general audit-event table remains
deferred.

## Session And Request Safety

State-changing Phase 5D UI operations use Next.js Server Actions, which enforce
same-origin action requests. Session cookies are inaccessible to browser
JavaScript. No sensitive provider token or role claim is placed in query strings,
local storage, or client-readable cookies.

UI visibility is not an authorization boundary. Server Components, Server
Actions, route handlers, services, and tenant-scoped repositories enforce the
same context independently.

## Consequences

Positive:

- Provider selection remains reversible.
- Email changes do not break identity mapping.
- Multiple organizations are supported without trusting local storage.
- Role and office changes take effect on the next request.
- Cross-tenant probes use not-found/inaccessible equivalence.

Tradeoffs:

- Protected local flows require PostgreSQL and explicit development setup.
- Production sign-in remains unavailable until a provider is approved.
- Application-layer authorization still needs RLS evaluation as defense in depth.
- Security mutation metadata is not durable until the audit-event phase.

## Rejected Alternatives

- Trusting browser role or tenant claims: rejected because they are attacker-controlled.
- Treating email as immutable identity: rejected because email can change.
- Arbitrary development identity headers: rejected because they can leak into
  deployed request paths.
- Selecting a production provider silently: rejected because provider choice is
  an unresolved architecture and operating decision.
- Proxy-only authorization: rejected because protected services and repositories
  must enforce scope even when invoked outside page navigation.

## Follow-Up Decisions

- Select and integrate the production managed identity provider.
- Decide invitation acceptance and delivery.
- Add persistent general security audit events.
- Evaluate PostgreSQL RLS before pilot production.
