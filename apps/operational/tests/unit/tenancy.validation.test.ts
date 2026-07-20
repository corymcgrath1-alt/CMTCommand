import { describe, expect, it } from "vitest";
import {
  createOfficeInputSchema,
  createOrganizationInputSchema,
  isSupportedIanaTimeZone,
  normalizeOfficeCode,
  normalizeOrganizationSlug,
  officeCodeInputSchema,
  officeTimeZoneInputSchema,
  organizationSlugInputSchema,
} from "../../src/server/tenancy/validation";

describe("tenancy validation", () => {
  it("normalizes organization slugs deterministically and returns the normalized value", () => {
    expect(normalizeOrganizationSlug("  Acme Testing_Group  ")).toBe("acme-testing-group");
    expect(organizationSlugInputSchema.parse("  Acme   Main_Office  ")).toBe(
      "acme-main-office",
    );
  });

  it("rejects ambiguous organization slug characters", () => {
    expect(() => organizationSlugInputSchema.parse("Acme & Co")).toThrow(
      /lowercase letters/,
    );
  });

  it("normalizes office codes deterministically and returns the normalized value", () => {
    expect(normalizeOfficeCode("  aus lab_1  ")).toBe("AUS-LAB-1");
    expect(officeCodeInputSchema.parse("  main lab  ")).toBe("MAIN-LAB");
  });

  it("rejects invalid office code characters", () => {
    expect(() => officeCodeInputSchema.parse("Austin/01")).toThrow(
      /uppercase letters/,
    );
  });

  it("validates supported IANA time zones without a hand-written zone list", () => {
    expect(isSupportedIanaTimeZone("America/Chicago")).toBe(true);
    expect(officeTimeZoneInputSchema.parse("America/New_York")).toBe("America/New_York");
    expect(() => officeTimeZoneInputSchema.parse("Tomorrow/Readiness")).toThrow(
      /IANA/,
    );
  });

  it("validates organization and office create inputs with constrained statuses", () => {
    expect(
      createOrganizationInputSchema.parse({
        slug: "Acme Pilot",
        name: " Acme Pilot Office ",
      }),
    ).toEqual({
      slug: "acme-pilot",
      name: "Acme Pilot Office",
      status: "active",
    });

    expect(() =>
      createOfficeInputSchema.parse({
        organizationId: "not-a-uuid",
        code: "main",
        name: "Main",
        timeZone: "America/Chicago",
        status: "archived",
      }),
    ).toThrow();
  });
});
