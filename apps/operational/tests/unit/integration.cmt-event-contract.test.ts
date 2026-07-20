import { describe, expect, it } from "vitest";

import e2eFixture from "../../../../contracts/cmtcommand-integration/v1/fixtures/e2e-concrete-lab-cycle.json";
import envelopeSchema from "../../../../contracts/cmtcommand-integration/v1/schemas/event-envelope.schema.json";
import {
  cmtIntegrationPayloadSchemas,
  getCanonicalCmtIntegrationEventTypes,
  validateCmtIntegrationEvent,
} from "../../src/server/integration/cmt-events";

type ContractEnvelopeSchema = {
  properties: {
    eventType: {
      enum: string[];
    };
  };
};

describe("CMT integration event contract", () => {
  it("derives the operational event-type list from the canonical schema", () => {
    const schemaEventTypes = (envelopeSchema as ContractEnvelopeSchema).properties.eventType.enum;

    expect(getCanonicalCmtIntegrationEventTypes()).toEqual(schemaEventTypes);
    expect(Object.keys(cmtIntegrationPayloadSchemas).sort()).toEqual([...schemaEventTypes].sort());
  });

  it("validates the canonical happy-path fixture through the operational Zod adapter", () => {
    for (const event of e2eFixture.events) {
      const result = validateCmtIntegrationEvent(event);

      expect(result.success, event.eventId).toBe(true);
    }
  });

  it("rejects stale tenant and branch vocabulary at the operational boundary", () => {
    const event = {
      ...e2eFixture.events[0],
      tenantId: "tenant-potomac",
      branchId: "branch-dc",
    };

    const result = validateCmtIntegrationEvent(event);

    expect(result.success).toBe(false);
  });

  it("rejects ambiguous specimen counts on individual specimen events", () => {
    const specimen = e2eFixture.events.find((event) => event.eventType === "SpecimenCreated");
    expect(specimen).toBeDefined();

    const result = validateCmtIntegrationEvent({
      ...specimen,
      payload: {
        ...specimen?.payload,
        specimenCount: 4,
      },
    });

    expect(result.success).toBe(false);
  });
});
