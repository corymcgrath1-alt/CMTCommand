const assert = require("assert");
const control = require("../demoControlCenter.js");
const compression = require("../operationalCompression.js");
const impact = require("../operationalImpact.js");
const walkthrough = require("../demoWalkthrough.js");
const pilotPack = require("../pilotReadinessPack.js");

const requiredUtilities = {
  operationalCompression: compression,
  operationalImpact: impact,
  demoWalkthrough: walkthrough,
  pilotReadinessPack: pilotPack
};

const validImpactSnapshot = {
  generatedAt: "6/23/26, 10:00 AM",
  issuesCaughtBeforeTomorrow: 7,
  estimatedReviewTimeSavedMinutes: {
    savedMinutesLow: 35,
    savedMinutesHigh: 50,
    formulaDescription: "Manual review estimate with conservative 30-40% CMTCommand review range."
  },
  highestRiskWorkOrder: {
    id: "TRD-104",
    status: "Not Ready",
    reason: "Assigned technician is unavailable.",
    recommendedFix: "Approve Maria Lopez for coverage."
  },
  repeatFailurePatterns: [{ title: "Certification and coverage gaps", severity: "High", count: 3 }],
  coverageBottlenecks: [{ affectedServiceType: "Concrete coverage", riskLevel: "High" }],
  dataQualityScore: { score: 84, gradeLabel: "Usable" },
  pilotRoiCopyText: "Pilot ROI Snapshot\nIssues caught before tomorrow: 7",
  operationalImpactCopyText: "Operational Impact Summary\nIssues caught before tomorrow: 7",
  sourceDetails: {
    "Time savings formula": "Manual review estimate with conservative range.",
    "Work orders reviewed": ["TRD-104"]
  },
  pilotRoiSummary: "TRD-104 is the highest-risk work order before approval."
};

const validTrd104 = {
  order: {
    id: "TRD-104",
    project: "Potomac Crossing Garage",
    service: "Concrete Pour",
    requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
    requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
    requiredClearance: ["Garage safety orientation"],
    status: "Scheduled"
  },
  readiness: {
    status: "Not Ready",
    blockers: ["Assigned technician is unavailable; needs qualified ACI concrete coverage."],
    warnings: [],
    reasons: ["Missing qualified coverage for the concrete pour."]
  },
  mariaCandidate: {
    canAssign: true,
    tech: {
      id: "DT-08",
      name: "Maria Lopez",
      status: "Available",
      schedule: "Open for emergency coverage before 8:00 AM",
      clearances: ["Garage safety orientation"],
      equipmentAccess: ["Concrete field kit"],
      certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 260 }]
    }
  },
  canRecordDecisionLog: true
};

function fullCopyMaterials() {
  return control.COPY_MATERIAL_SPECS.reduce((acc, item) => {
    acc[item.id] = { label: item.label, text: `${item.label}\nReady copy payload for the demo.` };
    return acc;
  }, {});
}

function fullPilotMaterials() {
  return {
    summary: { text: "Pilot Materials Summary\nTRD-104 proof." },
    founderChecklist: { text: pilotPack.getFounderChecklistCopy() },
    qualificationQuestions: { text: pilotPack.getQuestionCopy("all") },
    dataRequest: { text: "CMTCommand Pilot Data Request\nNo payroll, pricing, HR notes, or sensitive personal data needed.\nData not needed: payroll and pricing." },
    successCriteria: { text: pilotPack.getPilotSuccessCriteriaCopy() },
    objectionHandling: { text: pilotPack.getObjectionHandlingCopy(false) },
    managerEmail: { text: pilotPack.getManagerEmailCopy() },
    postDemoFollowUp: { text: pilotPack.getPostDemoFollowUpCopy({ impactSnapshot: validImpactSnapshot }) },
    onePageBusinessCase: { text: pilotPack.getOnePageBusinessCaseCopy({ impactSnapshot: validImpactSnapshot }) },
    demoScorecard: { text: pilotPack.getDemoScorecardCopy({ "score-0": true }) }
  };
}

function validContext(overrides = {}) {
  return {
    generatedAt: "6/23/26, 10:00 AM",
    requiredUtilities,
    trd104: validTrd104,
    impactSnapshot: validImpactSnapshot,
    decisionLog: [],
    canRecordDecisionLog: true,
    copyMaterials: fullCopyMaterials(),
    pilotMaterials: fullPilotMaterials(),
    pages: [["pilotpack", "Pilot Materials", "PM"]],
    pageLabels: { pilotpack: "Pilot Readiness Pack" },
    walkthroughSteps: [
      { id: "start", title: "Scheduled Does Not Mean Ready", page: "command", target: "tomorrow-ops-brief" },
      { id: "approve", title: "Approve Coverage", page: "demo", target: "approve-coverage-plan" }
    ],
    walkthroughTargetRegistry: {
      "tomorrow-ops-brief": { page: "command" },
      "approve-coverage-plan": { page: "demo" }
    },
    storageSnapshot: {
      "cmtcommand-demo-walkthrough": JSON.stringify({ isWalkthroughActive: false }),
      "cmtcommand-theme": "light",
      unrelated: "keep"
    },
    localState: {
      activePage: "demoqa",
      uiMode: "command",
      theme: "light",
      trd104Approved: false,
      decisionLogEntryCount: 0,
      scorecardCheckedCount: 1
    },
    ...overrides
  };
}

const health = control.createDemoHealthReport(validContext());
assert.strictEqual(health.overallStatus, "Ready for Demo");
assert(health.passingChecks > 0);
assert.strictEqual(health.failingChecks, 0);
assert(health.warningChecks >= 0);
assert(health.recommendedNextAction.includes("Pilot Story Mode"));

const trdStory = control.checkTRD104Story(validContext());
assert.strictEqual(trdStory.status, "pass");
assert.strictEqual(trdStory.failingChecks, 0);
assert(trdStory.checks.find(check => check.id === "maria-lopez-qualified").summary.includes("Maria"));

const missingStory = control.checkTRD104Story(validContext({ trd104: { order: null, readiness: {} } }));
assert(missingStory.failingChecks >= 1);
assert(missingStory.checks.some(check => check.id === "trd-104-exists" && check.status === "fail"));

const missingUtilities = control.checkRequiredUtilities({ requiredUtilities: { operationalCompression: {} } });
assert(missingUtilities.failingChecks >= 1);
assert(missingUtilities.checks.some(check => check.id === "utility-operationalCompression" && check.status === "fail"));

const copyMaterials = fullCopyMaterials();
copyMaterials.managerEmail = { label: "Manager Email copy", text: "" };
const copyAudit = control.checkCopyMaterials({ copyMaterials });
assert(copyAudit.checks.some(check => check.id === "copy-managerEmail" && check.status === "fail"));

const badImpact = control.checkOperationalImpact({
  impactSnapshot: {
    issuesCaughtBeforeTomorrow: "many",
    estimatedReviewTimeSavedMinutes: {},
    highestRiskWorkOrder: {},
    repeatFailurePatterns: [],
    coverageBottlenecks: [],
    dataQualityScore: {},
    pilotRoiCopyText: "",
    sourceDetails: {}
  }
});
assert(badImpact.checks.some(check => check.id === "impact-issues-numeric" && check.status === "fail"));
assert(badImpact.checks.some(check => check.id === "impact-time-savings-range" && check.status === "fail"));

const pilotAudit = control.checkPilotMaterials({
  pages: [["pilotpack", "Pilot Materials", "PM"]],
  pageLabels: { pilotpack: "Pilot Readiness Pack" },
  pilotMaterials: {
    summary: { text: "Pilot Materials Summary" },
    dataRequest: { text: "" },
    managerEmail: { text: "" },
    onePageBusinessCase: { text: "" },
    demoScorecard: { text: "" }
  }
});
assert(pilotAudit.checks.some(check => check.id === "pilot-material-managerEmail" && check.status === "fail"));
assert(pilotAudit.checks.some(check => check.id === "pilot-material-dataRequest" && check.status === "fail"));
assert(pilotAudit.checks.some(check => check.id === "pilot-material-onePageBusinessCase" && check.status === "fail"));
assert(pilotAudit.checks.some(check => check.id === "pilot-material-demoScorecard" && check.status === "fail"));

const limitations = control.createKnownLimitations().join("\n");
assert(/Static demo data only/i.test(limitations));
assert(/not exact ROI/i.test(limitations));
assert(/No backend persistence/i.test(limitations));
assert(/Not a LIMS replacement/i.test(limitations));

const reportCopy = control.createQAReportCopy(health);
assert(reportCopy.includes("Demo Health: Ready for Demo"));
assert(reportCopy.includes("Checks:"));
assert(reportCopy.includes("TRD-104 Story Status"));
assert(reportCopy.includes("Known Limitations"));
assert(reportCopy.includes("Not a LIMS replacement"));
assert(reportCopy.includes("Recommended next action"));

const resetPlan = control.createDemoResetPlan();
assert.deepStrictEqual(resetPlan.storageKeys, control.KNOWN_DEMO_STORAGE_KEYS);
assert(!resetPlan.storageKeys.includes("cmtcommand-theme"));
assert(!resetPlan.storageKeys.includes("cmtcommand-ui-mode"));
assert(!resetPlan.storageKeys.includes("unrelated"));

const localState = control.checkLocalDemoState({
  "cmtcommand-demo-walkthrough": JSON.stringify({ isWalkthroughActive: false }),
  "cmtcommand-demo-control-checklist": JSON.stringify({ "open-control-center": true }),
  unrelated: "keep"
});
assert(localState.checks.some(check => check.id === "full-reset-targets-known-keys" && check.status === "pass"));
