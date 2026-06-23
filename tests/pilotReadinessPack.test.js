const assert = require("assert");
const pack = require("../pilotReadinessPack.js");

const managerEmail = pack.getManagerEmailCopy();
assert(managerEmail.includes("checking whether tomorrow's scheduled work is actually ready"));
assert(managerEmail.includes("not meant to replace your scheduling system"));
assert(managerEmail.includes("coverage, certification, equipment, calibration, or data is missing"));

const dataRequest = pack.getPilotDataRequestCopy();
assert(dataRequest.includes("Work order ID"));
assert(dataRequest.includes("Technician name or anonymized ID"));
assert(dataRequest.includes("Calibration due date"));
assert(dataRequest.includes("Data not needed"));
assert(dataRequest.includes("Payroll"));
assert(dataRequest.includes("Client pricing"));
assert(dataRequest.includes("HR notes"));
assert(dataRequest.includes("sensitive HR data needed"));

const businessCase = pack.getOnePageBusinessCaseCopy({
  impactSnapshot: {
    highestRiskWorkOrder: { id: "TRD-104" },
    issuesCaughtBeforeTomorrow: 7,
    estimatedReviewTimeSavedMinutes: { savedMinutesLow: 35, savedMinutesHigh: 50 },
    repeatFailurePatterns: [{ title: "Certification coverage is the main readiness constraint" }],
    dataQualityScore: { gradeLabel: "Usable" },
    recommendedManagerActions: ["Approve Maria Lopez for TRD-104 coverage."]
  }
});
assert(businessCase.includes("Problem"));
assert(businessCase.includes("Pilot scope"));
assert(businessCase.includes("Success criteria"));
assert(businessCase.includes("What is out of scope"));
assert(businessCase.includes("TRD-104"));

const objections = pack.getObjectionHandlingCopy();
assert(objections.includes("deterministic rules and source-backed recommendations"));
assert(objections.includes("Managers approve coverage changes"));

const success = pack.getPilotSuccessCriteriaCopy();
assert(success.includes("issues caught before dispatch"));
assert(success.includes("Estimated review time saved"));
assert(success.includes("repeat failure patterns"));
assert(success.includes("Data quality score"));

const scorecard = pack.getDemoScorecardCopy({ "score-0": true, "score-9": true });
assert(scorecard.includes("[x] Did the buyer recognize the TRD-104 problem?"));
assert(scorecard.includes("[x] Did they agree to a next step?"));
assert(scorecard.includes("[ ] Did they care about certification coverage?"));

const summary = pack.createPilotMaterialsSummary({
  impactSnapshot: {
    highestRiskWorkOrder: { id: "TRD-999" },
    issuesCaughtBeforeTomorrow: 12,
    estimatedReviewTimeSavedMinutes: { savedMinutesLow: 20, savedMinutesHigh: 30 },
    repeatFailurePatterns: [{ title: "Equipment readiness depends on calibration visibility" }],
    dataQualityScore: { gradeLabel: "Needs Cleanup" },
    recommendedManagerActions: ["Clean up service type mapping."]
  }
});
assert.strictEqual(summary.highestRiskWorkOrder, "TRD-999");
assert.strictEqual(summary.issuesCaughtBeforeTomorrow, 12);
assert.strictEqual(summary.estimatedReviewTimeSaved, "20-30 min");
assert.strictEqual(summary.dataQualityGrade, "Needs Cleanup");

const fallback = pack.createPilotMaterialsSummary({});
assert.strictEqual(fallback.highestRiskWorkOrder, "TRD-104");
assert(fallback.recommendedManagerAction.includes("Maria Lopez"));

const followUp = pack.getPostDemoFollowUpCopy({ impactSnapshot: { highestRiskWorkOrder: { id: "TRD-104" }, issuesCaughtBeforeTomorrow: 7, estimatedReviewTimeSavedMinutes: { savedMinutesLow: 35, savedMinutesHigh: 50 } } });
assert(followUp.includes("Thank you"));
assert(followUp.includes("limited export"));
assert(followUp.includes("2-4 week pilot"));

const questions = pack.getQuestionCopy("owner");
assert(questions.includes("Owner / Executive"));
assert(questions.includes("What would make a 30-day pilot worth continuing?"));

[
  managerEmail,
  dataRequest,
  businessCase,
  objections,
  success,
  scorecard,
  followUp,
  questions,
  pack.getFounderChecklistCopy()
].forEach(text => {
  assert(text.trim().length > 50);
});

console.log("pilotReadinessPack tests passed");
