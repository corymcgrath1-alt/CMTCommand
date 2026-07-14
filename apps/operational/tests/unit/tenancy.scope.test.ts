import { describe, expect, it } from "vitest";
import {
  officeIsAllowedByScope,
  parseTenantAccessScope,
} from "../../src/server/tenancy/scope";

const organizationId = "6f66ff8b-b785-4482-8ec7-750d1616d182";
const firstOfficeId = "f7906c77-82c2-4852-9bec-8b834501f2c1";
const secondOfficeId = "098d64ac-dbf3-46fb-96df-f0c9e7d21627";

describe("tenant access scopes", () => {
  it("parses organization-wide office access", () => {
    expect(
      parseTenantAccessScope({
        organizationId,
        officeAccess: "all",
      }),
    ).toEqual({
      status: "ok",
      scope: {
        organizationId,
        officeAccess: "all",
      },
    });
  });

  it("parses restricted office access and keeps an empty list restricted", () => {
    expect(
      parseTenantAccessScope({
        organizationId,
        officeAccess: "restricted",
        officeIds: [],
      }),
    ).toEqual({
      status: "ok",
      scope: {
        organizationId,
        officeAccess: "restricted",
        officeIds: [],
      },
    });
  });

  it("rejects invalid restricted office identifiers", () => {
    const result = parseTenantAccessScope({
      organizationId,
      officeAccess: "restricted",
      officeIds: ["not-a-uuid"],
    });

    expect(result.status).toBe("validation_error");
  });

  it("does not treat missing office restrictions as organization-wide access", () => {
    const result = parseTenantAccessScope({
      organizationId,
      officeAccess: "restricted",
    });

    expect(result.status).toBe("validation_error");
  });

  it("evaluates office id membership for restricted scopes", () => {
    const scope = {
      organizationId,
      officeAccess: "restricted" as const,
      officeIds: [firstOfficeId],
    };

    expect(officeIsAllowedByScope(scope, firstOfficeId)).toBe(true);
    expect(officeIsAllowedByScope(scope, secondOfficeId)).toBe(false);
  });
});
