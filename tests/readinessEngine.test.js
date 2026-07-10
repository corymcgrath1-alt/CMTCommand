const assert = require("assert");
const engine = require("../readinessEngine.js");

const serviceRequirements = {
  "Concrete Pour": {
    requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
    requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
    clearance: ["Garage safety orientation"]
  },
  "Soil Density": {
    requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
    requiredEquipment: ["Troxler gauge"],
    clearance: ["Site access confirmed"]
  }
};

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
  priority: "Urgent"
};

const technicians = [
  {
    id: "DT-01",
    name: "Maria Sanchez",
    branch: "Springfield",
    status: "Unavailable",
    schedule: "Called out for tomorrow morning",
    clearances: ["Site orientation"],
    equipmentAccess: ["Concrete field kit"],
    currentAssignment: "TRD-104",
    certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 185 }]
  },
  {
    id: "DT-02",
    name: "Jamal Price",
    branch: "Springfield",
    status: "Available",
    distance: "18 min",
    clearances: ["Site orientation"],
    equipmentAccess: ["Concrete field kit"],
    currentAssignment: "TRD-101",
    returningToOffice: true,
    certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 220 }]
  },
  {
    id: "DT-03",
    name: "Elena Wu",
    branch: "Manassas",
    status: "Available",
    distance: "24 min",
    clearances: ["Site access confirmed"],
    equipmentAccess: ["Troxler gauge"],
    currentAssignment: "TRD-102",
    certs: [
      { name: "WACEL Soils", expiresIn: 21 },
      { name: "Nuclear Gauge Safety", expiresIn: 44 }
    ]
  },
  {
    id: "DT-08",
    name: "Maria Lopez",
    branch: "Springfield",
    status: "Available",
    distance: "10 min",
    schedule: "Open for emergency coverage before 8:00 AM",
    clearances: ["Site orientation", "Garage safety orientation"],
    equipmentAccess: ["Concrete field kit", "Troxler gauge"],
    currentAssignment: "",
    cascadingImpact: "No scheduled job breaks if reassigned.",
    returningToOffice: true,
    certs: [
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 260 },
      { name: "WACEL Soils", expiresIn: 120 },
      { name: "Nuclear Gauge Safety", expiresIn: 150 }
    ]
  }
];

const equipment = [
  { id: "AM-09", category: "Air meter", name: "Air meter AM-09", status: "Available", calibrationDays: 92 },
  { id: "AM-14", category: "Air meter", name: "Air meter AM-14", status: "Available", calibrationDays: 18 },
  { id: "TH-03", category: "Thermometer", name: "Humboldt field thermometer TH-03", status: "Available", calibrationDays: 75 },
  { id: "SC-18", category: "Slump cone kit", name: "Slump cone kit SC-18", status: "Available", calibrationDays: 180 },
  { id: "CM-44", category: "Cylinder molds", name: "Cylinder molds CM-44", status: "Available", calibrationDays: 120 },
  { id: "NG-27", category: "Troxler gauge", name: "Troxler gauge NG-27", status: "Limited/shared", calibrationDays: 12 },
  { id: "NG-31", category: "Troxler gauge", name: "Troxler gauge NG-31", status: "Out of service", calibrationDays: -6 }
];

const workOrders = [
  {
    id: "TRD-101",
    service: "Concrete Pour",
    project: "Riverside Medical Tower",
    assignedTechId: "DT-02",
    requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
    requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
    requiredClearance: ["Site orientation"]
  },
  {
    id: "TRD-102",
    service: "Soil Density",
    project: "I-66 Logistics Pad",
    assignedTechId: "DT-03",
    requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
    requiredEquipment: ["Troxler gauge"],
    requiredClearance: ["Site access confirmed"],
    scheduleWarning: "Troxler gauge is shared with an afternoon backfill inspection."
  },
  trd104
];

const pickups = [
  {
    id: "CP-505",
    workOrderId: "TRD-104",
    cylinderType: "Field",
    pickupDueDate: "2026-06-12",
    pickupStatus: "Assigned",
    assignedPickupTechnicianId: "DT-02",
    readinessIssue: "Future pickup assigned."
  }
];

function context(overrides = {}) {
  return {
    technicians,
    equipment,
    serviceRequirements,
    workOrders,
    pickups,
    pickupAssignments: {},
    assignments: {},
    preferredBranch: "Springfield",
    tomorrowDate: "2026-06-12",
    ...overrides
  };
}

const before = engine.evaluateWorkOrderReadiness(trd104, context());
assert.strictEqual(before.status, "Not Ready");
assert(before.blockers.some(item => /Maria Sanchez is unavailable/i.test(item)));
assert(before.sourceFacts.requiredCerts.includes("ACI Concrete Field Testing Technician Grade I"));

const afterMaria = engine.evaluateWorkOrderReadiness(trd104, context({ candidateTechId: "DT-08" }));
assert.strictEqual(afterMaria.status, "Ready");
assert.deepStrictEqual(afterMaria.blockers, []);
assert(afterMaria.reasons.some(item => /Assigned technician, required certifications/i.test(item)));

const candidates = engine.createCoverageCandidates(trd104, context());
assert.strictEqual(candidates[0].tech.name, "Maria Lopez");
assert.strictEqual(candidates[0].canAssign, true);
assert.strictEqual(candidates[0].evaluation.status, "Ready");
assert(candidates.find(candidate => candidate.tech.name === "Jamal Price").evaluation.blockers.some(item => /Garage safety orientation/i.test(item)));
assert(candidates.find(candidate => candidate.tech.name === "Elena Wu").evaluation.blockers.some(item => /ACI Concrete/i.test(item)));

const noValid = engine.createCoverageCandidates({
  id: "TRD-200",
  service: "Concrete Pour",
  assignedTechId: "",
  requiredCerts: ["ICC Structural Steel"],
  requiredEquipment: ["Steel inspection kit"],
  requiredClearance: ["Metro security clearance"]
}, context({
  equipment: [{ id: "ST-22", category: "Steel inspection kit", name: "Steel kit", status: "Available", calibrationDays: 100 }]
}));
assert.strictEqual(noValid.some(candidate => candidate.canAssign), false);

const expiredCert = engine.evaluateWorkOrderReadiness(trd104, context({
  technicians: [{
    id: "DT-X",
    name: "Expired Tech",
    status: "Available",
    clearances: ["Garage safety orientation"],
    equipmentAccess: ["Concrete field kit"],
    certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: -2 }]
  }],
  assignments: { "TRD-104": "DT-X" }
}));
assert.strictEqual(expiredCert.status, "Not Ready");
assert(expiredCert.blockers.some(item => /expired/i.test(item)));

const expiringCert = engine.evaluateWorkOrderReadiness(trd104, context({
  technicians: [{
    id: "DT-W",
    name: "Warning Tech",
    status: "Available",
    clearances: ["Garage safety orientation"],
    equipmentAccess: ["Concrete field kit"],
    certs: [{ name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 12 }]
  }],
  assignments: { "TRD-104": "DT-W" }
}));
assert.strictEqual(expiringCert.status, "At Risk");
assert(expiringCert.warnings.some(item => /expires in 12 days/i.test(item)));

const noEquipment = engine.evaluateWorkOrderReadiness(trd104, context({ equipment: [] }));
assert.strictEqual(noEquipment.status, "Not Ready");
assert(noEquipment.blockers.some(item => /No Slump cone kit/i.test(item)));

const pickupRisk = engine.evaluatePickupReadiness({
  id: "CP-900",
  workOrderId: "TRD-900",
  cylinderType: "Field",
  pickupDueDate: "2026-06-12",
  pickupStatus: "Unassigned"
}, context());
assert.strictEqual(pickupRisk.readiness, "At Risk");
assert(pickupRisk.issues.some(item => /no pickup technician assigned/i.test(item)));

const incompletePickupDate = engine.evaluatePickupReadiness({
  id: "CP-901",
  workOrderId: "TRD-901",
  cylinderType: "Field",
  pickupStatus: "Unassigned"
}, context());
assert.strictEqual(incompletePickupDate.dueTomorrow, false);
assert.strictEqual(incompletePickupDate.overdue, false);

const summary = engine.summarizeSchedule(workOrders, context());
assert.strictEqual(summary.total, 3);
assert.strictEqual(summary.notReady, 1);
assert(summary.jobs.find(job => job.order.id === "TRD-104").readiness.status === "Not Ready");

console.log("readinessEngine tests passed");
