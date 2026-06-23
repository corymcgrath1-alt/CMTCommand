const assert = require("assert");
const walkthrough = require("../demoWalkthrough.js");

const steps = walkthrough.getSteps();

assert.strictEqual(steps.length, 11);
assert.strictEqual(steps[0].id, "scheduled-not-ready");
assert.strictEqual(steps[steps.length - 1].id, "final-pilot-takeaway");
assert(walkthrough.validateSteps(steps));

steps.forEach(step => {
  assert(step.title, `${step.id} title missing`);
  assert(step.seeing, `${step.id} seeing missing`);
  assert(step.why, `${step.id} why missing`);
  assert(step.takeaway, `${step.id} takeaway missing`);
  assert(step.primaryLabel, `${step.id} primary action missing`);
});

const ids = steps.map(step => step.id);
assert.strictEqual(new Set(ids).size, ids.length);

const targetIds = walkthrough.getTargetIds();
assert(targetIds.includes("tomorrow-ops-brief"));
assert(targetIds.includes("trd-104-readiness-packet"));
assert(targetIds.includes("maria-coverage-handoff"));
assert(targetIds.includes("approve-coverage-plan"));
assert(targetIds.includes("smart-intake-summary"));
assert.strictEqual(walkthrough.getUniqueTargetIds().length, new Set(targetIds).size);

const progress = walkthrough.getProgress("coverage-handoff");
assert.strictEqual(progress.label, "Step 6 of 11");
assert.strictEqual(progress.current, 6);
assert.strictEqual(progress.total, 11);
assert(progress.percent > 50);

const initial = walkthrough.createInitialState("now");
assert.strictEqual(initial.isWalkthroughActive, false);
assert.strictEqual(initial.currentWalkthroughStepId, "scheduled-not-ready");
assert.strictEqual(initial.walkthroughMode, "pilot-story");
assert.strictEqual(initial.walkthroughActionsTaken.approvedMariaLopez, false);

const reset = walkthrough.resetWalkthroughState("later");
assert.deepStrictEqual(reset.walkthroughActionsTaken, initial.walkthroughActionsTaken);
assert.strictEqual(reset.walkthroughStartedAt, "");
assert.strictEqual(reset.walkthroughCompletedAt, "");

const baseImpact = {
  issuesCaughtBeforeTomorrow: 7,
  highestRiskWorkOrder: { id: "TRD-104" },
  estimatedReviewTimeSavedMinutes: { savedMinutesLow: 35, savedMinutesHigh: 50 },
  repeatFailurePatterns: [{ title: "Certification and coverage gaps are the main readiness constraint" }],
  recommendedManagerActions: ["Approve Maria Lopez for coverage."]
};

const notApprovedRecap = walkthrough.createDemoRecap({
  approvedMariaLopez: false,
  impactSnapshot: baseImpact
});

assert(notApprovedRecap.includes("Scheduled does not mean ready"));
assert(notApprovedRecap.includes("TRD-104"));
assert(notApprovedRecap.includes("recommended Maria Lopez"));
assert(notApprovedRecap.includes("prepared a source-backed handoff packet for approval"));
assert(!notApprovedRecap.includes("documented the approval"));

const approvedRecap = walkthrough.createDemoRecap({
  approvedMariaLopez: true,
  impactSnapshot: baseImpact
});

assert(approvedRecap.includes("documented the approval in the Decision Log"));
assert(approvedRecap.includes("35-50 minutes"));
assert(approvedRecap.includes("Buyer takeaway"));
assert(approvedRecap.includes("catch tomorrow's dispatch failures"));

console.log("demoWalkthrough tests passed");
