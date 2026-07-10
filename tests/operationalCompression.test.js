const assert = require("assert");
const ops = require("../operationalCompression.js");

const generatedAt = "6/22/26, 4:00 PM";

const trd104 = {
  id: "TRD-104",
  time: "7:30 AM",
  project: "Potomac Crossing Garage",
  service: "Concrete Pour",
  location: "Fairfax, VA",
  assignedTechId: "DT-01",
  requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
  requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
  requiredClearance: ["Garage safety orientation"],
  priority: "Urgent",
  scope: "Morning elevated-deck pour with truck window opening at 8:00 AM."
};

const assignedTech = {
  id: "DT-01",
  name: "Maria Sanchez",
  status: "Unavailable",
  clearances: ["Site orientation"],
  certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 185 }]
};

const mariaLopez = {
  id: "DT-08",
  name: "Maria Lopez",
  status: "Available",
  branch: "Springfield",
  distance: "10 min",
  schedule: "Open for emergency coverage before 8:00 AM",
  clearances: ["Site orientation", "Garage safety orientation"],
  equipmentAccess: ["Concrete field kit", "Troxler gauge"],
  certs: [
    { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 260 },
    { name: "WACEL Soils", expiresIn: 120 }
  ]
};

const beforeReadiness = {
  status: "Not Ready",
  assignedTech,
  requiredCerts: trd104.requiredCerts,
  requiredEquipment: trd104.requiredEquipment,
  requiredClearance: trd104.requiredClearance,
  blockers: ["Maria Sanchez is unavailable for tomorrow's work window."],
  warnings: []
};

const mariaCandidate = {
  tech: mariaLopez,
  canAssign: true,
  clearanceMatch: true,
  equipmentAccess: true,
  sameOffice: true,
  impact: {
    label: "No new gap",
    detail: "No scheduled job breaks if reassigned."
  },
  evaluation: {
    status: "Ready",
    requiredCerts: trd104.requiredCerts,
    requiredEquipment: trd104.requiredEquipment,
    requiredClearance: trd104.requiredClearance,
    blockers: [],
    warnings: [],
    equipmentPlan: []
  }
};

const packet = ops.createWorkOrderReadinessPacket(trd104, {
  generatedAt,
  readiness: beforeReadiness,
  assignedTech,
  recommendedCandidate: mariaCandidate,
  pickup: { id: "CP-505", pickupStatus: "Assigned" }
});

assert(packet.headline.includes("TRD-104"));
assert(packet.summary.includes("Maria Sanchez is unavailable"));
assert(packet.summary.includes("Approve Maria Lopez"));
assert(packet.keyFacts.some(fact => fact.includes("Scheduled does not mean ready")));
assert(packet.sourceFields["Required certifications"].includes("ACI Concrete Field Testing Technician Grade I"));
assert(packet.copyText.includes("PM Handoff"));
assert.strictEqual(packet.stale, false);

const stalePacket = ops.createWorkOrderReadinessPacket(trd104, {
  generatedAt,
  readiness: beforeReadiness,
  assignedTech,
  recommendedCandidate: mariaCandidate,
  previousSourceHash: "src-deadbeef"
});
assert.strictEqual(stalePacket.stale, true);

const handoff = ops.createCoverageHandoffPacket(trd104, mariaLopez, {
  generatedAt,
  candidate: mariaCandidate,
  currentReadiness: beforeReadiness,
  afterReadiness: mariaCandidate.evaluation
});

assert(handoff.headline.includes("Coverage Handoff: TRD-104"));
assert(handoff.summary.includes("Maria Lopez"));
assert(handoff.summary.includes("Approval will move TRD-104 from Not Ready to Ready"));
assert(handoff.sourceFields["Matching certifications"].includes("ACI Concrete Field Testing Technician Grade I"));
assert(handoff.copyText.includes("Recommended action: Approve Maria Lopez for TRD-104."));

const decision = ops.createDecisionSummary({
  id: "EDL-001",
  timestamp: generatedAt,
  role: "Executive",
  emergencyWorkOrder: "TRD-104 / Potomac Crossing Garage",
  decisionType: "Approve Coverage",
  issue: "Maria Sanchez is unavailable for tomorrow's work window.",
  recommendedAction: "Assign Maria Lopez to TRD-104",
  approvedAction: "Approved Maria Lopez for Concrete Pour",
  assignedTechnician: "Maria Lopez",
  required: "ACI Concrete Field Testing Technician Grade I / Garage safety orientation",
  reason: "Maria Lopez has the required certification, clearance, equipment access, and no scheduled job breaks.",
  remainingRisks: "None after reassignment.",
  jobsAffected: ["TRD-104"],
  equipmentAffected: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
  readinessChecksUsed: ["Availability", "Certifications", "Clearance", "Equipment calibration", "Cascading impact"],
  beforeStatus: "Not Ready",
  afterStatus: "Ready",
  statusAfterDecision: "TRD-104 moved from Not Ready to Ready."
}, { generatedAt });

assert(decision.summary.includes("Status changed from Not Ready to Ready"));
assert(decision.sourceFields["Readiness checks used"].includes("Cascading impact"));
assert(decision.copyText.includes("Decision Summary"));

const intake = ops.createPilotIntakeSummary([
  { work_order: "TRD-104", project: "Potomac Crossing Garage", service_type: "Concrete Pour", location: "Fairfax, VA" },
  { work_order: "TRD-105", project: "Capital Metro Station", service_type: "", location: "Washington, DC" },
  { work_order: "TRD-105", project: "Capital Metro Station", service_type: "Structural Steel Inspection", location: "" }
], {
  missingColumns: [],
  rowWarnings: ["Row 2: missing service_type", "Row 3: missing location"],
  duplicateWarnings: ["Row 3: possible duplicate Work Orders"]
}, { generatedAt, label: "Work Orders" });

assert.strictEqual(intake.sourceFields["Rows imported"], 3);
assert.strictEqual(intake.sourceFields["Usable rows"], 1);
assert.strictEqual(intake.sourceFields["Rows missing required fields"], 2);
assert.strictEqual(intake.sourceFields["Duplicate risks"], 1);
assert(intake.cleanupRequestText.includes("Pilot cleanup request for Work Orders"));
assert(intake.copyText.includes("Smart Intake Cleanup Request"));

const blockedIntake = ops.createPilotIntakeSummary([
  { work_order: "TRD-104", project: "Potomac Crossing Garage", service_type: "Concrete Pour" }
], {
  parseErrors: ["Unmatched quote near line 2"],
  missingColumns: [],
  rowWarnings: [],
  duplicateWarnings: []
}, { generatedAt, label: "Work Orders" });

assert.strictEqual(blockedIntake.status, "Blocked");
assert.strictEqual(blockedIntake.sourceFields["Accepted rows"], 0);
assert.strictEqual(blockedIntake.copyButtonLabel, "Copy Parse Error");
assert(!/imported/i.test(blockedIntake.summary));
assert(!/imported/i.test(blockedIntake.cleanupRequestText));
assert(blockedIntake.cleanupRequestText.includes("No rows were accepted"));

const bannedCopyTerms = /(AI-generated|semantic compression|token savings|machine learning)/i;
assert(!bannedCopyTerms.test(packet.copyText));
assert(!bannedCopyTerms.test(handoff.copyText));
assert(!bannedCopyTerms.test(decision.copyText));
assert(!bannedCopyTerms.test(intake.copyText));
assert(!bannedCopyTerms.test(blockedIntake.copyText));

console.log("operationalCompression tests passed");
