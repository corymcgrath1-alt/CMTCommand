import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_TYPES,
  createSimulatorState,
  loadJson,
  runEvents,
  simulateOutbox,
  traceSpecimen,
} from "../simulator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(contractRoot, "..", "..", "..");

function readContractJson(relativePath) {
  return loadJson(path.join(contractRoot, relativePath));
}

function fixturePath(name) {
  return path.join(contractRoot, "fixtures", name);
}

function assertSummary(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (["lastCode", "amendments", "attempts", "queuedAfterOfflineAttempts", "traceSpecimenId", "approvedTestSetId", "finalWorkOrderStatus"].includes(key)) {
      continue;
    }
    assert.equal(actual[key], value, `summary ${key}`);
  }
}

const envelopeSchema = readContractJson("schemas/event-envelope.schema.json");
const eventsSchema = readContractJson("schemas/events.schema.json");
const openapi = readContractJson("openapi.json");

assert.equal(envelopeSchema.properties.schemaVersion.const, "cmtcommand.integration.event.v1");
assert.deepEqual(envelopeSchema.properties.eventType.enum, EVENT_TYPES);
assert.equal(eventsSchema.oneOf.length, EVENT_TYPES.length);
assert.equal(openapi.openapi, "3.1.0");
assert.ok(openapi.paths["/v1/events"].post, "OpenAPI intake endpoint exists");
assert.ok(openapi.paths["/v1/events/feed"].get, "OpenAPI cursor feed exists");
assert.ok(openapi.paths["/v1/lab-results/{testSetId}/status"].get, "OpenAPI read-only lab status exists");

const requiredDocs = [
  "docs/integration/architecture.md",
  "docs/integration/ownership-matrix.md",
  "docs/integration/identifiers-and-states.md",
  "docs/integration/threat-model.md",
  "docs/integration/migration-plan.md",
];

for (const docPath of requiredDocs) {
  assert.ok(fs.existsSync(path.join(repoRoot, docPath)), `documentation exists: ${docPath}`);
}

const e2eFixture = loadJson(fixturePath("e2e-concrete-lab-cycle.json"));
const e2eRun = runEvents(e2eFixture.events);
assertSummary(e2eRun.summary, e2eFixture.expected);
assert.equal(e2eRun.results.every((item) => item.status === "accepted"), true);

const finalWorkOrder = e2eRun.state.workOrders.get("WO-TRD-104");
assert.equal(finalWorkOrder.status, e2eFixture.expected.finalWorkOrderStatus);

const trace = traceSpecimen(e2eRun.state, e2eFixture.expected.traceSpecimenId);
assert.deepEqual(trace.custody, ["field-created", "transferred-to-lab", "received-by-lab"]);
assert.equal(trace.labResultStatus, "result-approved");
assert.deepEqual(trace.approvedStrength, { value: 4956, unit: "psi" });

const labResult = e2eRun.state.labResults.get(e2eFixture.expected.approvedTestSetId);
assert.equal(labResult.approved.immutableResult.compressiveStrength.value, 4956);
assert.equal(labResult.results.length, 2, "7-day and 28-day results retained");

const dispatchMutation = {
  ...e2eFixture.events.find((event) => event.eventType === "OperationalStatusChanged"),
  eventId: "16161616-1616-4161-8161-161616161616",
  revision: 5,
  idempotencyKey: "idem-dispatch-lab-mutation-attempt",
  payload: {
    status: "attempted_lab_result_edit",
    reason: "negative test",
    attemptedLabResultMutation: true,
  },
};
const mutationRun = runEvents([dispatchMutation], e2eRun.state);
assert.equal(mutationRun.results[0].status, "rejected");
assert.equal(mutationRun.results[0].code, "dispatch-lab-result-mutation");
assert.equal(labResult.approved.immutableResult.compressiveStrength.value, 4956, "approved result stayed immutable");

const failureFixtures = loadJson(fixturePath("failure-cases.json"));
for (const scenario of failureFixtures.scenarios) {
  if (scenario.outbox) {
    const outboxRun = simulateOutbox(scenario.outbox);
    assert.equal(outboxRun.attempts.length, scenario.expected.attempts, scenario.name);
    assert.equal(outboxRun.summary.accepted, scenario.expected.accepted, scenario.name);
    assert.equal(outboxRun.attempts.filter((attempt) => attempt.syncState === "queued").length, scenario.expected.queuedAfterOfflineAttempts, scenario.name);
    continue;
  }

  const setupEvents = Number.isInteger(scenario.useE2EThroughIndex)
    ? e2eFixture.events.slice(0, scenario.useE2EThroughIndex + 1)
    : [];
  const state = createSimulatorState();
  runEvents(setupEvents, state);
  const scenarioRun = runEvents(scenario.events, state);
  assertSummary(scenarioRun.summary, scenario.expected);

  if (scenario.expected.lastCode) {
    const lastResult = scenarioRun.results[scenarioRun.results.length - 1];
    assert.equal(lastResult.code, scenario.expected.lastCode, scenario.name);
  }

  if (Number.isInteger(scenario.expected.amendments)) {
    const amended = scenarioRun.state.labResults.get("TS-TRD-104-A");
    assert.equal(amended.amendments.length, scenario.expected.amendments, scenario.name);
    assert.equal(amended.approved.immutableResult.compressiveStrength.value, 4956, "amendment did not overwrite approved result");
  }
}

console.log("CMTCommand integration contract simulator tests passed");
