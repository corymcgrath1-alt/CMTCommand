const assert = require("assert");
const impact = require("../operationalImpact.js");

const generatedAt = "6/22/26, 4:30 PM";

const technicians = [
  {
    id: "DT-01",
    name: "Maria Sanchez",
    status: "Unavailable",
    branch: "Springfield",
    clearances: ["Site orientation"],
    certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 185 }]
  },
  {
    id: "DT-08",
    name: "Maria Lopez",
    status: "Available",
    branch: "Springfield",
    clearances: ["Site orientation", "Garage safety orientation"],
    certs: [
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 260 },
      { name: "WACEL Soils", expiresIn: 120 },
      { name: "Nuclear Gauge Safety", expiresIn: 150 }
    ]
  },
  {
    id: "DT-03",
    name: "Elena Wu",
    status: "Available",
    branch: "Manassas",
    clearances: ["Site access confirmed"],
    certs: [
      { name: "WACEL Soils", expiresIn: 21 },
      { name: "Nuclear Gauge Safety", expiresIn: 44 }
    ]
  }
];

const equipment = [
  { id: "AM-09", category: "Air meter", name: "Air meter AM-09", status: "Available", calibrationDays: 92 },
  { id: "AM-14", category: "Air meter", name: "Air meter AM-14", status: "Available", calibrationDays: 18 },
  { id: "NG-31", category: "Troxler gauge", name: "Troxler gauge NG-31", status: "Out of service", calibrationDays: -6 }
];

const beforeJobs = [
  {
    order: {
      id: "TRD-104",
      time: "7:30 AM",
      project: "Potomac Crossing Garage",
      service: "Concrete Pour",
      location: "Fairfax, VA",
      priority: "Urgent",
      requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
      requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
      requiredClearance: ["Garage safety orientation"]
    },
    readiness: {
      status: "Not Ready",
      assignedTech: technicians[0],
      requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
      requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
      requiredClearance: ["Garage safety orientation"],
      blockers: ["Maria Sanchez is unavailable for tomorrow's work window."],
      warnings: []
    }
  },
  {
    order: {
      id: "TRD-102",
      time: "8:30 AM",
      project: "I-66 Logistics Pad",
      service: "Soil Density",
      location: "Manassas, VA",
      priority: "Normal",
      requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
      requiredEquipment: ["Troxler gauge"],
      requiredClearance: ["Site access confirmed"]
    },
    readiness: {
      status: "At Risk",
      assignedTech: technicians[2],
      requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
      requiredEquipment: ["Troxler gauge"],
      requiredClearance: ["Site access confirmed"],
      blockers: [],
      warnings: ["Troxler gauge is shared with an afternoon backfill inspection."]
    }
  },
  {
    order: {
      id: "TRD-101",
      time: "7:00 AM",
      project: "Riverside Medical Tower",
      service: "Concrete Pour",
      location: "Arlington, VA",
      priority: "High",
      requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
      requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
      requiredClearance: ["Site orientation"]
    },
    readiness: {
      status: "Ready",
      assignedTech: technicians[1],
      requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
      requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
      requiredClearance: ["Site orientation"],
      blockers: [],
      warnings: []
    }
  }
];

const beforeSnapshot = impact.createOperationalImpactSnapshot({
  generatedAt,
  readinessJobs: beforeJobs,
  equipment,
  technicians,
  decisionLog: []
});

assert.strictEqual(beforeSnapshot.highestRiskWorkOrder.id, "TRD-104");
assert(beforeSnapshot.issuesCaughtBeforeTomorrow >= 1);
assert(beforeSnapshot.certificationRisks.some(item => item.workOrderId === "TRD-104"));
assert(beforeSnapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow > 0);
assert(beforeSnapshot.estimatedReviewTimeSavedMinutes.savedMinutesHigh >= beforeSnapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow);
assert(beforeSnapshot.estimatedReviewTimeSavedMinutes.formulaDescription.includes("30-40%"));
assert(beforeSnapshot.repeatFailurePatterns.some(pattern => /Certification and coverage/i.test(pattern.title)));
assert(beforeSnapshot.coverageBottlenecks.some(item => /Concrete \/ reinforced concrete inspection coverage/.test(item.affectedServiceType)));
assert(beforeSnapshot.pilotRoiCopyText.includes("Issues caught before tomorrow"));
assert(beforeSnapshot.pilotRoiCopyText.includes("Estimated review time saved"));
assert(beforeSnapshot.pilotRoiCopyText.includes("Highest-risk work order: TRD-104"));
assert(beforeSnapshot.pilotRoiCopyText.includes("Recommended manager action"));

const issues = impact.calculateIssuesCaught(beforeJobs, equipment, technicians, []);
assert(issues.byType["unavailable assigned technician"] >= 1);

const dataQualityStrong = impact.calculateDataQualityScore([
  {
    work_order: "TRD-104",
    requested_start: "2026-06-12 07:30",
    service_type: "Concrete Pour",
    location: "Fairfax, VA",
    required_certifications: "ACI Concrete Field Testing Technician Grade I",
    required_equipment: "Air meter"
  }
], { missingColumns: [], rowWarnings: [], duplicateWarnings: [] }, beforeJobs);

const dataQualityWeak = impact.calculateDataQualityScore([
  {
    work_order: "TRD-104",
    requested_start: "",
    service_type: "",
    location: "",
    required_certifications: "",
    required_equipment: ""
  }
], {
  missingColumns: [],
  rowWarnings: [
    "Row 1: missing requested_start",
    "Row 1: missing service_type",
    "Row 1: missing location",
    "Row 1: missing required_certifications",
    "Row 1: missing required_equipment"
  ],
  duplicateWarnings: ["Row 1: possible duplicate Work Orders"]
}, beforeJobs);

assert(dataQualityWeak.score < dataQualityStrong.score);
assert.strictEqual(dataQualityWeak.readinessDemoUsable, false);

const decisionLog = [{
  id: "EDL-001",
  timestamp: generatedAt,
  role: "Executive",
  emergencyWorkOrder: "TRD-104 / Potomac Crossing Garage",
  decisionType: "Approve Coverage",
  assignedTechnician: "Maria Lopez",
  beforeStatus: "Not Ready",
  afterStatus: "Ready",
  impactLanguage: "Impact: approving Maria Lopez resolved the highest-risk coverage blocker for tomorrow and reduced not-ready work by 1.",
  statusAfterDecision: "TRD-104 moved from Not Ready to Ready."
}];

const afterJobs = beforeJobs.map(job => job.order.id === "TRD-104"
  ? {
      ...job,
      readiness: {
        ...job.readiness,
        status: "Ready",
        assignedTech: technicians[1],
        blockers: [],
        warnings: []
      }
    }
  : job);

const afterSnapshot = impact.createOperationalImpactSnapshot({
  generatedAt,
  readinessJobs: afterJobs,
  equipment,
  technicians,
  decisionLog
});

assert(afterSnapshot.pilotRoiSummary.includes("Decision impact: approving Maria Lopez improved tomorrow readiness"));
assert(afterSnapshot.pilotRoiSummary.includes("TRD-104 coverage blocker"));
assert.notStrictEqual(afterSnapshot.highestRiskWorkOrder.id, "TRD-104");

console.log("operationalImpact tests passed");
