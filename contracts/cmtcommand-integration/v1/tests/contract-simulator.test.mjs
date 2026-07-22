import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_TYPES,
  createSimulatorState,
  loadJson,
  readEventFeed,
  runEvents,
  simulateOutbox,
  traceSpecimen,
  validateEnvelope,
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  const output = clone(target);
  for (const [key, value] of Object.entries(source || {})) {
    if (isPlainObject(value) && isPlainObject(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = clone(value);
    }
  }
  return output;
}

function materializeEvent(spec, e2eFixture) {
  if (spec.value) {
    return clone(spec.value);
  }

  const event = clone(e2eFixture.events[spec.fromHappyIndex]);
  return deepMerge(event, spec.overrides || {});
}

function materializeScenarioEvents(scenario, e2eFixture) {
  const setup = Number.isInteger(scenario.setupThroughIndex)
    ? e2eFixture.events.slice(0, scenario.setupThroughIndex + 1)
    : [];

  return [
    ...setup.map(clone),
    ...(scenario.events || []).map((eventSpec) => materializeEvent(eventSpec, e2eFixture)),
  ];
}

function assertSummary(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if ([
      "lastCode",
      "amendments",
      "attempts",
      "queuedAfterOfflineAttempts",
      "physicalSpecimens",
      "uniqueSpecimenIds",
      "sevenDaySpecimenId",
      "twentyEightDaySpecimenIds",
      "traceSpecimenId",
      "approvedTestSetId",
      "averageEventId",
      "finalWorkOrderStatus",
      "approvedStrength",
    ].includes(key)) {
      continue;
    }
    assert.equal(actual[key], value, `summary ${key}`);
  }
}

function getJsonPointer(json, pointer) {
  if (!pointer || pointer === "#") {
    return json;
  }

  const parts = pointer.replace(/^#\//, "").split("/").filter(Boolean);
  let current = json;
  for (const rawPart of parts) {
    const part = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    assert.ok(current && Object.hasOwn(current, part), `JSON pointer part exists: ${rawPart}`);
    current = current[part];
  }

  return current;
}

function collectRefs(value, refs = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, refs));
    return refs;
  }

  if (!value || typeof value !== "object") {
    return refs;
  }

  if (typeof value.$ref === "string") {
    refs.push(value.$ref);
  }

  Object.values(value).forEach((item) => collectRefs(item, refs));
  return refs;
}

function assertRefsResolve(relativePath) {
  const sourceFile = path.join(contractRoot, relativePath);
  const source = loadJson(sourceFile);
  const refs = collectRefs(source);

  for (const ref of refs) {
    const [rawFile, rawPointer = ""] = ref.split("#");
    const targetFile = rawFile
      ? path.resolve(path.dirname(sourceFile), rawFile)
      : sourceFile;
    assert.ok(fs.existsSync(targetFile), `referenced file exists: ${ref}`);
    const target = loadJson(targetFile);
    assert.ok(getJsonPointer(target, rawPointer ? `#${rawPointer}` : "#"), `reference resolves: ${ref}`);
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
assert.ok(openapi.paths["/v1/test-sets/{testSetId}/lab-status"].get, "OpenAPI lab status exists");
assert.ok(envelopeSchema.required.includes("organizationId"), "organizationId is canonical");
assert.ok(envelopeSchema.required.includes("officeId"), "officeId is canonical");
assert.equal(Object.hasOwn(envelopeSchema.properties, "tenantId"), false, "tenantId is not a schema field");
assert.equal(Object.hasOwn(envelopeSchema.properties, "branchId"), false, "branchId is not a schema field");

assertRefsResolve("schemas/events.schema.json");
assertRefsResolve("openapi.json");

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

const eventExamples = openapi.paths["/v1/events"].post.requestBody.content["application/json"].examples;
for (const [exampleName, example] of Object.entries(eventExamples)) {
  assert.deepEqual(validateEnvelope(example.value), [], `OpenAPI example validates: ${exampleName}`);
}

const e2eFixture = loadJson(fixturePath("e2e-concrete-lab-cycle.json"));
for (const event of e2eFixture.events) {
  assert.deepEqual(validateEnvelope(event), [], `fixture event validates: ${event.eventId}`);
}

const e2eRun = runEvents(e2eFixture.events);
assertSummary(e2eRun.summary, e2eFixture.expected);
assert.equal(e2eRun.results.every((item) => item.status === "accepted"), true, "complete happy path accepted");

const finalWorkOrder = e2eRun.state.workOrders.get("WO-TRD-104");
assert.equal(finalWorkOrder.status, e2eFixture.expected.finalWorkOrderStatus);

const specimenCreatedEvents = e2eFixture.events.filter((event) => event.eventType === "SpecimenCreated");
assert.equal(specimenCreatedEvents.length, e2eFixture.expected.physicalSpecimens, "four physical cylinders are represented by four events");
assert.equal(new Set(specimenCreatedEvents.map((event) => event.specimenId)).size, e2eFixture.expected.uniqueSpecimenIds, "specimen IDs are unique");
assert.equal(new Set(specimenCreatedEvents.map((event) => event.payload.specimenLabel)).size, e2eFixture.expected.uniqueSpecimenIds, "specimen labels are unique");
assert.equal(specimenCreatedEvents.every((event) => !Object.hasOwn(event.payload, "specimenCount")), true, "SpecimenCreated has no specimenCount");

const breakResults = e2eFixture.events.filter((event) => event.eventType === "BreakResultRecorded");
const sevenDayResult = breakResults.find((event) => event.payload.breakAgeDays === 7);
const twentyEightDayResults = breakResults.filter((event) => event.payload.breakAgeDays === 28);
assert.equal(sevenDayResult.specimenId, e2eFixture.expected.sevenDaySpecimenId);
assert.deepEqual(twentyEightDayResults.map((event) => event.specimenId), e2eFixture.expected.twentyEightDaySpecimenIds);
assert.equal(twentyEightDayResults.every((event) => event.specimenId !== sevenDayResult.specimenId), true, "7-day and 28-day results use different specimens");

const average = e2eRun.state.ageGroupAverages.get(e2eFixture.expected.averageEventId);
assert.ok(average, "age group average exists");
assert.deepEqual(average.resultEventIds, twentyEightDayResults.map((event) => event.eventId), "age-group average references individual result events");
assert.equal(average.payload.averageCompressiveStrength.value, 4986);

const trace = traceSpecimen(e2eRun.state, e2eFixture.expected.traceSpecimenId);
assert.deepEqual(trace.custody, ["field-created", "transferred-to-lab", "received-by-lab"]);
assert.equal(trace.status, "approved");
assert.deepEqual(trace.approvedStrength, { value: 4956, unit: "psi" });

const feedPage = readEventFeed(e2eRun.state, "0", 5);
assert.equal(feedPage.events.length, 5, "cursor feed returns bounded page");
assert.equal(feedPage.nextCursor, "5");
assert.equal(feedPage.hasMore, true);

const failureFixtures = loadJson(fixturePath("failure-cases.json"));
for (const scenario of failureFixtures.scenarios) {
  if (scenario.outbox) {
    const outboxEvent = materializeEvent({ fromHappyIndex: scenario.outbox.eventFromHappyIndex }, e2eFixture);
    const outboxRun = simulateOutbox({
      networkPlan: scenario.outbox.networkPlan,
      event: outboxEvent,
    });
    assert.equal(outboxRun.attempts.length, scenario.expected.attempts, scenario.name);
    assert.equal(outboxRun.summary.accepted, scenario.expected.accepted, scenario.name);
    assert.equal(outboxRun.attempts.filter((attempt) => attempt.syncState === "queued").length, scenario.expected.queuedAfterOfflineAttempts, scenario.name);
    continue;
  }

  const scenarioEvents = materializeScenarioEvents(scenario, e2eFixture);
  const scenarioRun = runEvents(scenarioEvents, createSimulatorState());
  assertSummary(scenarioRun.summary, scenario.expected);

  if (scenario.expected.lastCode) {
    const lastResult = scenarioRun.results[scenarioRun.results.length - 1];
    assert.equal(lastResult.code, scenario.expected.lastCode, scenario.name);
  }

  if (Number.isInteger(scenario.expected.amendments)) {
    assert.equal(scenarioRun.state.amendments.length, scenario.expected.amendments, scenario.name);
    const approval = scenarioRun.state.approvals.get("23232323-2323-4323-8323-232323232323");
    assert.equal(approval.immutableResult.compressiveStrength.value, scenario.expected.approvedStrength, "amendment did not overwrite approved result");
  }
}

console.log("CMTCommand integration contract simulator tests passed");
