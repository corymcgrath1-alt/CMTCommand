const pages = [
  ["command", "Tomorrow Readiness", "TR"],
  ["demo", "Find Coverage", "FC"],
  ["dispatch", "Dispatch", "DP"],
  ["technicians", "People Readiness", "PR"],
  ["equipment", "Equipment Readiness", "ER"],
  ["dataintake", "Pilot Setup", "PS"],
  ["decisionlog", "Decision Log", "DL"],
  ["pilotpack", "Pilot Materials", "PM"],
  ["demoqa", "Demo QA", "QA"],
  ["settings", "Settings", "ST"]
];

const pageLabels = {
  command: "Tomorrow Readiness",
  demo: "Find Coverage",
  dispatch: "Dispatch",
  projects: "Projects Preview",
  workorders: "Work Orders Preview",
  technicians: "People Readiness",
  workforce: "Workforce Qualifications Preview",
  certifications: "Certifications Preview",
  equipment: "Equipment Readiness",
  laboratory: "Laboratory Preview",
  geotechnical: "Geotechnical Preview",
  reports: "Reports Preview",
  billing: "Billing Preview",
  dataintake: "Pilot Setup",
  decisionlog: "Decision Log",
  pilotpack: "Pilot Readiness Pack",
  demoqa: "Demo Control Center",
  settings: "Settings"
};

const allPageIds = Object.keys(pageLabels);

const roleAccess = {
  "Executive": allPageIds,
  "Branch Manager": allPageIds,
  "Dispatcher": ["command", "demo", "dispatch", "technicians", "equipment", "dataintake", "decisionlog", "pilotpack", "demoqa", "settings", "projects", "workorders", "workforce", "certifications"],
  "Project Manager": ["command", "demo", "dispatch", "technicians", "equipment", "dataintake", "decisionlog", "pilotpack", "demoqa", "settings", "projects", "workorders"],
  "Lab Manager": ["command", "demo", "dispatch", "technicians", "equipment", "dataintake", "decisionlog", "pilotpack", "demoqa", "settings", "laboratory", "reports"],
  "Field Technician": ["command", "demo", "technicians", "equipment", "pilotpack", "demoqa", "settings", "workorders"],
  "Geotechnical Engineer": ["command", "demo", "dispatch", "technicians", "equipment", "dataintake", "decisionlog", "pilotpack", "demoqa", "settings", "geotechnical", "projects"],
  "Admin / Billing": ["command", "demo", "dataintake", "decisionlog", "pilotpack", "demoqa", "settings", "billing", "reports"]
};

const authorizedLocationRoles = new Set(["Executive", "Branch Manager", "Dispatcher"]);

function getDemoShared() {
  return window.CMTDemoShared;
}

function getDemoTimestamp(value) {
  return getDemoShared().formatTimestamp(value);
}

function getInitialUiMode() {
  const param = new URLSearchParams(window.location.search).get("ui");
  if (param === "command" || param === "standard") return param;
  return getDemoShared().safeReadLocalStorage("cmtcommand-ui-mode", "standard") === "command" ? "command" : "standard";
}

function getInitialWalkthroughState() {
  const fallback = window.CMTDemoWalkthrough.createInitialState();
  const stored = getDemoShared().safeReadJsonLocalStorage("cmtcommand-demo-walkthrough", {});
  return {
    ...fallback,
    ...stored,
    walkthroughActionsTaken: {
      ...fallback.walkthroughActionsTaken,
      ...(stored.walkthroughActionsTaken || {})
    }
  };
}

function getInitialPreDemoChecklistState() {
  const stored = getDemoShared().safeReadJsonLocalStorage("cmtcommand-demo-control-checklist", {});
  const checklist = window.CMTDemoControlCenter?.createPreDemoChecklist?.() || [];
  return checklist.reduce((acc, item) => {
    acc[item.id] = Boolean(stored[item.id]);
    return acc;
  }, {});
}

const state = {
  activePage: "command",
  role: "Executive",
  selectedTech: "T-1006",
  selectedWorkOrder: "WO-2431",
  filters: {},
  sorts: {},
  locationViewLog: [],
  lastLocationLogKey: "",
  emergencyDecisionLog: [],
  intakeImport: null,
  intakeImportReadToken: 0,
  intakeSelectedEntity: "technicians",
  intakeImportedRecords: [],
  intakeDocuments: [],
  extractionSample: null,
  extractionSaved: [],
  extractionMessage: "",
  lastCsvExport: null,
  selectedDemoWorkOrder: "TRD-104",
  demoCoverageOpen: false,
  selectedDemoTech: "",
  demoDecisionNote: "",
  demoAssignments: {},
  demoDecision: null,
  demoScriptStep: 0,
  opsViewMode: "compressed",
  pilotRequests: [],
  pilotConfirmation: "",
  selectedCylinderPickup: "CP-501",
  pickupSuggestionsOpen: false,
  selectedPickupTech: "",
  pickupAssignments: {},
  selectedWorkforceEmployee: "WFE-004",
  pilotScorecard: {},
  preDemoChecklist: getInitialPreDemoChecklistState(),
  demoControlResetConfirm: false,
  uiMode: getInitialUiMode(),
  theme: getDemoShared().safeReadLocalStorage("cmtcommand-theme", "light"),
  ...getInitialWalkthroughState()
};

const certTypes = [
  "ACI Field I",
  "ACI Strength",
  "WACEL Soils",
  "WACEL Concrete",
  "WACEL Masonry",
  "ICC Reinforced Concrete",
  "ICC Structural Steel",
  "ICC Structural Welding",
  "Radiation Safety",
  "OSHA 30",
  "DOT Asphalt",
  "Troxler Gauge Safety"
];

const serviceCatalog = [
  ["Soil compaction testing", ["WACEL Soils", "Radiation Safety"], ["Nuclear gauge", "Vehicle"]],
  ["Concrete testing", ["ACI Field I"], ["Air meter", "Slump cone", "Cylinder molds"]],
  ["Concrete cylinder pickup", ["ACI Field I"], ["Vehicle", "Cylinder rack"]],
  ["Reinforcing steel inspection", ["ICC Reinforced Concrete"], ["Tablet", "Camera"]],
  ["Post-tension inspection", ["ICC Reinforced Concrete"], ["Tablet", "Camera"]],
  ["Masonry inspection", ["WACEL Masonry"], ["Tablet", "Camera"]],
  ["Structural steel inspection", ["ICC Structural Steel"], ["Tablet", "Camera"]],
  ["Fireproofing inspection", ["ICC Structural Steel"], ["Thickness gauge", "Camera"]],
  ["Asphalt testing", ["DOT Asphalt"], ["Thermometer", "Core kit"]],
  ["Foundation bearing inspection", ["WACEL Soils"], ["DCP", "Tablet"]],
  ["Proof roll observation", ["WACEL Soils"], ["Vehicle", "Tablet"]],
  ["Utility backfill testing", ["WACEL Soils", "Radiation Safety"], ["Nuclear gauge", "Vehicle"]],
  ["Lab sample pickup", ["ACI Field I"], ["Vehicle", "Cooler"]],
  ["Geotechnical boring observation", ["WACEL Soils"], ["Drill rig", "Sample jars"]]
];

const serviceTypeRequirements = {
  "Concrete Pour": {
    requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
    requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
    clearance: ["Site orientation"],
    risks: ["Cylinder pickup", "Mix design mismatch", "Missing batch ticket"]
  },
  "Soil Density": {
    requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
    requiredEquipment: ["Troxler gauge"],
    clearance: ["Site access confirmed"],
    risks: ["Gauge calibration expired", "Site access not confirmed"]
  },
  "Masonry Grout Inspection": {
    requiredCerts: ["WACEL Masonry"],
    requiredEquipment: ["Masonry grout kit"],
    clearance: ["Site orientation"],
    risks: ["Lab-cured cylinders not returning with technician", "Missing grout placement window"]
  },
  "Structural Steel Inspection": {
    requiredCerts: ["ICC Structural Steel"],
    requiredEquipment: ["Steel inspection kit"],
    clearance: ["Site orientation"],
    risks: ["Security clearance missing", "Approved drawings not available"]
  },
  "Rebar Inspection": {
    requiredCerts: ["ICC Reinforced Concrete"],
    requiredEquipment: ["Tablet / camera", "Approved drawings"],
    clearance: ["Site orientation"],
    risks: ["Missing drawings", "Clearance not approved"]
  },
  "Asphalt Density": {
    requiredCerts: ["Asphalt Field Technician", "Nuclear Gauge Safety"],
    requiredEquipment: ["Troxler gauge", "Thermometer"],
    clearance: ["Night-work approval"],
    risks: ["Night work coverage", "Gauge availability"]
  }
};

function normalizeDemoService(service) {
  const normalized = service.toLowerCase();
  if (normalized.includes("concrete pour") || normalized.includes("concrete testing")) return "Concrete Pour";
  if (normalized.includes("soil") || normalized.includes("compaction")) return "Soil Density";
  if (normalized.includes("masonry") || normalized.includes("grout")) return "Masonry Grout Inspection";
  if (normalized.includes("steel")) return "Structural Steel Inspection";
  if (normalized.includes("rebar") || normalized.includes("reinforced")) return "Rebar Inspection";
  if (normalized.includes("asphalt")) return "Asphalt Density";
  return service;
}

function getServiceRequirements(service) {
  return serviceTypeRequirements[normalizeDemoService(service)] || {
    requiredCerts: [],
    requiredEquipment: [],
    clearance: ["Site access confirmed"],
    risks: ["Project information incomplete"]
  };
}

function getReadinessEngine() {
  const utility = window.CMTReadinessEngine;
  if (!utility) throw new Error("CMTReadinessEngine must load before app.js");
  return utility;
}

function getReadinessEngineContext(extra = {}) {
  return {
    technicians: demoTechnicians,
    equipment: demoEquipment,
    serviceRequirements: serviceTypeRequirements,
    workOrders: demoWorkOrders,
    pickups: cylinderPickups,
    assignments: state.demoAssignments,
    pickupAssignments: state.pickupAssignments,
    preferredBranch: "Springfield",
    tomorrowDate: "2026-06-12",
    ...extra
  };
}

const emergencyRequest = {
  project: "Potomac Secure Logistics Center",
  contractor: "Atlantic Concrete Partners",
  service: "Last-minute concrete testing",
  truckEta: "90 minutes",
  requiredCerts: ["Level 2 Concrete"],
  requiredAccess: ["Secure Site Access"],
  requiredEquipment: ["Slump cone", "Air meter", "Thermometer", "Cylinder molds", "Sample tags"],
  priority: "Emergency"
};

const emergencyTechnicians = [
  {
    name: "Marcus Lee",
    certs: ["Level 2 Concrete", "Secure Site Access"],
    access: ["Secure Site Access"],
    equipment: ["Slump cone", "Air meter", "Thermometer", "Cylinder molds", "Sample tags"],
    distance: 18,
    availability: "Available soon",
    status: "Available",
    currentAssignment: null
  },
  {
    name: "Dana Ortiz",
    certs: ["Level 2 Concrete", "Secure Site Access"],
    access: ["Secure Site Access"],
    equipment: ["Slump cone", "Thermometer", "Cylinder molds", "Sample tags"],
    distance: 38,
    availability: "Available after lab pickup",
    status: "Available",
    currentAssignment: null,
    limitation: "Needs air meter pickup"
  },
  {
    name: "Mike Harris",
    certs: ["Level 2 Concrete", "Secure Site Access"],
    access: ["Secure Site Access"],
    equipment: ["Slump cone", "Air meter", "Thermometer", "Cylinder molds", "Sample tags"],
    distance: 22,
    availability: "Assigned until covered",
    status: "Assigned",
    currentAssignment: {
      service: "Rebar inspection",
      project: "Arlington Medical Pavilion",
      priority: "Critical",
      requiredCerts: ["ICC Reinforced Concrete"],
      requiredEquipment: ["Inspection tablet", "Camera", "Rebar gauge"],
      requiredAccess: ["Standard Site Access"],
      startTime: "10:30 AM",
      movable: false,
      clientImpact: "Inspection hold point blocks concrete placement if uncovered.",
      driveTimeImpact: "Adds 22 minutes to emergency site after coverage handoff.",
      overtimeImpact: "Possible 0.5 hr overtime if emergency runs long."
    }
  },
  {
    name: "James Walker",
    certs: ["ICC Reinforced Concrete", "Secure Site Access"],
    access: ["Secure Site Access", "Standard Site Access"],
    equipment: ["Inspection tablet", "Camera", "Rebar gauge"],
    distance: 46,
    distanceToMikeJob: 14,
    availability: "Available after 10:10 AM",
    status: "Available",
    currentAssignment: null,
    note: "Can cover Mike's rebar inspection but cannot cover emergency concrete request."
  },
  {
    name: "Cory McGrath",
    certs: ["Level 2 Concrete"],
    access: ["Standard Site Access"],
    equipment: ["Slump cone", "Air meter", "Thermometer", "Cylinder molds", "Sample tags"],
    distance: 12,
    availability: "Available",
    status: "Available",
    currentAssignment: null
  },
  {
    name: "Elena Brooks",
    certs: ["Level 2 Concrete expired", "Secure Site Access"],
    access: ["Secure Site Access"],
    equipment: ["Slump cone", "Air meter", "Thermometer", "Cylinder molds", "Sample tags"],
    distance: 28,
    availability: "Available",
    status: "Available",
    currentAssignment: null
  },
  {
    name: "Rob Chen",
    certs: ["ICC Reinforced Concrete", "WACEL Soils"],
    access: ["Secure Site Access", "Airport Badge"],
    equipment: ["Inspection tablet", "Camera", "Proof roll kit"],
    distance: 31,
    availability: "Assigned",
    status: "Assigned",
    currentAssignment: {
      service: "Airport proof roll",
      project: "Dulles Apron Repair",
      priority: "Critical",
      requiredCerts: ["WACEL Soils"],
      requiredEquipment: ["Proof roll kit", "Vehicle", "Tablet"],
      requiredAccess: ["Airport Badge"],
      startTime: "10:00 AM",
      movable: false,
      clientImpact: "Airfield access window is difficult to recover if missed.",
      driveTimeImpact: "High cross-region drive impact.",
      overtimeImpact: "Likely overtime and schedule compression."
    }
  }
];

const approvedPartnerFirms = [
  {
    name: "Metro Materials Testing",
    services: ["Concrete testing", "Soil compaction", "Masonry"],
    certifications: ["ACI Field", "WACEL Concrete", "WACEL Soils"],
    secureAccess: "Available for select technicians",
    region: "DC / Northern Virginia / Maryland",
    responseMinutes: 120,
    typicalResponse: "2 hours",
    status: "Active",
    rating: 4.5,
    contact: "Tanya Brooks",
    phone: "(202) 555-0184",
    email: "dispatch@metromaterialstesting.demo"
  },
  {
    name: "Capitol Geotech & Testing",
    services: ["Geotechnical drilling", "Soils lab", "Density testing", "Foundation observations"],
    certifications: ["WACEL Soils", "AASHTO lab capability"],
    secureAccess: "No",
    region: "DC / Maryland",
    responseMinutes: 240,
    typicalResponse: "Same day if scheduled before noon",
    status: "Backup Only",
    rating: 4.0,
    contact: "Andre Mills",
    phone: "(301) 555-0198",
    email: "coordination@capitolgeotech.demo"
  },
  {
    name: "Atlantic Inspection Partners",
    services: ["Rebar inspection", "Post-tension", "Structural steel", "Fireproofing"],
    certifications: ["ICC Reinforced Concrete", "ICC Structural Steel", "ICC Fireproofing"],
    secureAccess: "Yes",
    region: "VA / DC / MD",
    responseMinutes: 150,
    typicalResponse: "1-3 hours",
    status: "Active",
    rating: 4.7,
    contact: "Monica Reyes",
    phone: "(703) 555-0166",
    email: "partners@atlanticinspection.demo"
  },
  {
    name: "Mid-Atlantic Lab & Field Services",
    services: ["Concrete testing", "Lab testing", "Aggregate testing", "CCRL/AASHTO-accredited lab support"],
    certifications: ["ACI", "AASHTO", "CCRL-related lab capabilities"],
    secureAccess: "Limited",
    region: "DMV",
    responseMinutes: 300,
    typicalResponse: "Next day, emergency by approval",
    status: "Active",
    rating: 4.2,
    contact: "Renee Patel",
    phone: "(571) 555-0139",
    email: "fielddesk@midatlanticlab.demo"
  }
];

const intakeEntityConfig = {
  technicians: {
    label: "Technicians",
    buttonLabel: "Export Technicians",
    requiredColumns: ["name", "role", "branch", "status", "certifications", "clearance", "phone", "email"],
    rows: () => technicians.map(tech => ({
      name: tech.name,
      role: tech.role,
      branch: tech.branch,
      status: tech.status,
      certifications: tech.certifications.join("; "),
      clearance: tech.access || tech.trackingSource.includes("Personal") ? "Secure Site Access" : "Standard Site Access",
      phone: tech.phone,
      email: tech.email
    }))
  },
  certifications: {
    label: "Certifications",
    buttonLabel: "Export Certifications",
    requiredColumns: ["technician", "certification", "issuing_body", "issue_date", "expiration_date", "status"],
    rows: () => certifications.map(cert => ({
      technician: cert.technician,
      certification: cert.type,
      issuing_body: cert.issuer,
      issue_date: cert.issue,
      expiration_date: cert.expiration,
      status: cert.status
    }))
  },
  equipment: {
    label: "Equipment",
    buttonLabel: "Export Equipment",
    requiredColumns: ["equipment_id", "type", "serial_number", "assigned_to", "calibration_due", "status"],
    rows: () => equipment.map(item => ({
      equipment_id: item.id,
      type: item.category,
      serial_number: item.serial,
      assigned_to: item.assignedTech,
      calibration_due: item.calibrationDue,
      status: item.status
    }))
  },
  workorders: {
    label: "Work Orders",
    buttonLabel: "Export Work Orders",
    requiredColumns: ["work_order", "project", "service_type", "required_certifications", "required_equipment", "priority", "status", "requested_start"],
    rows: () => workOrders.map(order => ({
      work_order: order.id,
      project: order.project,
      service_type: order.service,
      required_certifications: order.requiredCerts.join("; "),
      required_equipment: order.requiredEquipment.join("; "),
      priority: order.priority,
      status: order.status,
      requested_start: order.requiredTime
    }))
  },
  partners: {
    label: "Partner Firms",
    buttonLabel: "Export Partner Firms",
    requiredColumns: ["firm_name", "services", "certifications", "clearance_capability", "region", "response_time", "status", "preferred_rating"],
    rows: () => approvedPartnerFirms.map(firm => ({
      firm_name: firm.name,
      services: firm.services.join("; "),
      certifications: firm.certifications.join("; "),
      clearance_capability: firm.secureAccess,
      region: firm.region,
      response_time: firm.typicalResponse,
      status: firm.status,
      preferred_rating: firm.rating
    }))
  },
  projects: {
    label: "Projects",
    buttonLabel: "Export Projects",
    requiredColumns: ["project_name", "project_number", "client", "contractor", "location", "project_manager", "status"],
    rows: () => projects.map(project => ({
      project_name: project.name,
      project_number: project.id,
      client: project.client,
      contractor: project.contractor,
      location: project.address,
      project_manager: project.manager,
      status: project.status
    }))
  }
};

const intakeDocumentTypes = [
  "Concrete field report",
  "Soil density report",
  "Cylinder break report",
  "Certification card",
  "Calibration certificate",
  "CCRL proficiency sample instruction",
  "USACE validation document",
  "Proctor report",
  "Boring log field sheet",
  "Chain of custody",
  "Other"
];

const extractionSamples = {
  concrete: {
    title: "Concrete Field Report",
    module: "Reports",
    fields: {
      Project: "Potomac Secure Logistics Center",
      Contractor: "Atlantic Concrete Partners",
      Technician: "Marcus Lee",
      Date: "Today",
      Placement: "Loading dock slab",
      Truck: "18",
      "Mix ID": "4500 AE",
      Slump: "4.5 in",
      Air: "5.8%",
      Temperature: "72 F",
      "Cylinders made": "5",
      "Required certification": "Level 2 Concrete",
      "Equipment used": "Air Meter AM-14, Thermometer T-09",
      "Report status": "Needs review"
    },
    confidence: {
      Project: "High",
      Technician: "High",
      Truck: "Medium",
      "Mix ID": "Medium",
      Air: "High",
      Slump: "High",
      "Equipment ID": "Low"
    },
    warnings: ["Equipment ID confidence is low", "Confirm technician certification", "Confirm placement location", "Confirm cylinder count"]
  },
  calibration: {
    title: "Calibration Certificate",
    module: "Equipment",
    fields: {
      "Equipment ID": "AM-14",
      "Equipment type": "Air Meter",
      "Serial number": "84722",
      "Calibration date": "05/28/2026",
      "Calibration due": "05/28/2027",
      Status: "Current",
      "Related equipment": "Air Meter AM-14"
    },
    confidence: {
      "Equipment ID": "Medium",
      "Serial number": "High",
      "Calibration due": "High",
      Status: "High"
    },
    warnings: ["Confirm equipment ID before updating calibration record", "Verify certificate source"]
  },
  certification: {
    title: "Certification Card",
    module: "Certifications",
    fields: {
      Technician: "Marcus Lee",
      Certification: "Level 2 Concrete",
      "Issuing body": "WACEL",
      "Expiration date": "11/30/2026",
      Status: "Active"
    },
    confidence: {
      Technician: "High",
      Certification: "High",
      "Issuing body": "Medium",
      "Expiration date": "High"
    },
    warnings: ["Confirm technician identity", "Verify issuing body and expiration date"]
  }
};

const projects = [
  {
    id: "P-24018",
    name: "Springfield Data Center",
    client: "NovaCompute Holdings",
    contractor: "AnchorBuild Mid-Atlantic",
    owner: "NCH Infrastructure",
    address: "7420 Loisdale Rd, Springfield, VA",
    lat: 38.768,
    lng: -77.174,
    manager: "Priya Shah",
    branch: "Northern Virginia",
    sector: "Data center",
    status: "Active",
    start: "2026-03-04",
    end: "2027-01-15",
    contract: 740000,
    budgetHours: 2850,
    actualHours: 1218,
    margin: 31,
    openOrders: 9,
    reports: 44,
    billing: "Current"
  },
  {
    id: "P-24027",
    name: "Route 29 Bridge Rehabilitation",
    client: "VDOT District 9",
    contractor: "Granite Lane Civil",
    owner: "Commonwealth Transportation",
    address: "US-29 at Broad Run, Gainesville, VA",
    lat: 38.795,
    lng: -77.612,
    manager: "Marcus Reed",
    branch: "Northern Virginia",
    sector: "Highway / bridge",
    status: "Active",
    start: "2026-02-11",
    end: "2026-11-30",
    contract: 510000,
    budgetHours: 1990,
    actualHours: 1144,
    margin: 24,
    openOrders: 6,
    reports: 32,
    billing: "Unbilled items"
  },
  {
    id: "P-24033",
    name: "Arlington Medical Pavilion",
    client: "Capital Health Partners",
    contractor: "Harborline Construction",
    owner: "CHP Real Estate",
    address: "1200 N Glebe Rd, Arlington, VA",
    lat: 38.884,
    lng: -77.117,
    manager: "Elena Brooks",
    branch: "DC Metro",
    sector: "Medical",
    status: "Active",
    start: "2026-01-17",
    end: "2026-09-08",
    contract: 420000,
    budgetHours: 1560,
    actualHours: 1386,
    margin: 18,
    openOrders: 5,
    reports: 51,
    billing: "At risk"
  },
  {
    id: "P-24040",
    name: "Potomac Yard Mixed Use",
    client: "Crescent Urban Partners",
    contractor: "MetroForm Builders",
    owner: "Crescent Urban Partners",
    address: "2501 Main Line Blvd, Alexandria, VA",
    lat: 38.832,
    lng: -77.047,
    manager: "Jordan Kim",
    branch: "DC Metro",
    sector: "Commercial",
    status: "Active",
    start: "2026-04-01",
    end: "2027-03-22",
    contract: 610000,
    budgetHours: 2360,
    actualHours: 838,
    margin: 34,
    openOrders: 7,
    reports: 27,
    billing: "Current"
  },
  {
    id: "P-24052",
    name: "Fairfax Elementary Addition",
    client: "Fairfax County Schools",
    contractor: "Longview Public Works",
    owner: "Fairfax County Schools",
    address: "4000 Chain Bridge Rd, Fairfax, VA",
    lat: 38.846,
    lng: -77.306,
    manager: "Nina Patel",
    branch: "Northern Virginia",
    sector: "Educational",
    status: "Active",
    start: "2026-05-02",
    end: "2026-12-18",
    contract: 285000,
    budgetHours: 1180,
    actualHours: 264,
    margin: 29,
    openOrders: 3,
    reports: 16,
    billing: "Current"
  }
];

const techSeed = [
  ["T-1001", "Avery Walton", "Senior CMT Technician", "Northern Virginia", "Available", ["ACI Field I", "Radiation Safety", "WACEL Soils"], "Truck 12", "NG-204", 72, 96, 94],
  ["T-1002", "Ben Ortiz", "CMT Technician II", "Northern Virginia", "Onsite", ["ACI Field I", "WACEL Concrete"], "Truck 07", "AM-118", 84, 92, 90],
  ["T-1003", "Camille Nguyen", "Special Inspector", "DC Metro", "Assigned", ["ICC Reinforced Concrete", "ICC Structural Steel"], "Truck 18", "TAB-044", 69, 98, 88],
  ["T-1004", "Dev Singh", "Soils Technician", "Northern Virginia", "En route", ["WACEL Soils", "Radiation Safety"], "Truck 22", "NG-188", 91, 90, 91],
  ["T-1005", "Elijah Morgan", "Field Technician", "DC Metro", "Report writing", ["ACI Field I", "OSHA 30"], "Truck 09", "CM-090", 63, 87, 82],
  ["T-1006", "Fatima Henson", "Lead Technician", "Northern Virginia", "Available", ["ACI Field I", "WACEL Soils", "Radiation Safety", "DOT Asphalt"], "Truck 16", "NG-221", 78, 99, 96],
  ["T-1007", "Grant Liu", "Concrete Technician", "DC Metro", "Onsite", ["ACI Field I", "ACI Strength"], "Truck 03", "AM-101", 88, 94, 89],
  ["T-1008", "Hannah Price", "Masonry Inspector", "Northern Virginia", "Available", ["WACEL Masonry", "ICC Reinforced Concrete"], "Truck 11", "TAB-055", 55, 93, 86],
  ["T-1009", "Isaac Cole", "Steel Inspector", "DC Metro", "Unavailable", ["ICC Structural Steel", "ICC Structural Welding"], "Truck 14", "CAM-034", 48, 97, 92],
  ["T-1010", "Jules Ramsey", "CMT Technician I", "Northern Virginia", "Available", ["ACI Field I"], "Truck 20", "CM-121", 38, 84, 79],
  ["T-1011", "Keisha Bell", "Lab / Field Technician", "Northern Virginia", "In lab", ["ACI Strength", "ACI Field I"], "Truck 02", "PRESS-11", 66, 95, 93],
  ["T-1012", "Leo Martin", "Soils Technician", "DC Metro", "Onsite", ["WACEL Soils"], "Truck 05", "DCP-14", 77, 89, 85],
  ["T-1013", "Mara Jensen", "Special Inspector", "Northern Virginia", "Assigned", ["ICC Reinforced Concrete", "WACEL Masonry"], "Truck 17", "TAB-061", 74, 96, 91],
  ["T-1014", "Noah Clark", "Asphalt Technician", "Northern Virginia", "Available", ["DOT Asphalt", "Radiation Safety"], "Truck 24", "CORE-07", 58, 91, 86],
  ["T-1015", "Olivia Stone", "Field Technician", "DC Metro", "Off duty", ["ACI Field I", "WACEL Concrete"], "Truck 25", "AM-121", 42, 88, 80],
  ["T-1016", "Parker Miles", "CMT Technician II", "Northern Virginia", "On break", ["ACI Field I", "WACEL Soils"], "Truck 04", "CM-140", 68, 90, 84],
  ["T-1017", "Quinn Harper", "Geotechnical Field Rep", "DC Metro", "Available", ["WACEL Soils", "OSHA 30"], "Truck 28", "SPT-06", 61, 94, 89],
  ["T-1018", "Rafael Torres", "Senior Special Inspector", "Northern Virginia", "Onsite", ["ICC Structural Steel", "ICC Structural Welding", "ICC Reinforced Concrete"], "Truck 15", "CAM-088", 82, 98, 95],
  ["T-1019", "Sofia Keller", "Concrete Technician", "DC Metro", "Assigned", ["ACI Field I", "ACI Strength"], "Truck 19", "SLUMP-33", 73, 92, 87],
  ["T-1020", "Ty Walker", "CMT Technician I", "Northern Virginia", "Available", ["ACI Field I", "OSHA 30"], "Truck 30", "CM-155", 36, 83, 78]
];

const technicians = techSeed.map((t, index) => ({
  id: t[0],
  name: t[1],
  role: t[2],
  branch: t[3],
  status: t[4],
  certifications: t[5],
  vehicle: t[6],
  equipment: t[7],
  workload: t[8],
  quality: t[9],
  timeliness: t[10],
  phone: `(703) 555-${String(1100 + index).slice(-4)}`,
  email: `${t[1].toLowerCase().replaceAll(" ", ".")}@cmtcommand.demo`,
  supervisor: index % 2 ? "Marcus Reed" : "Priya Shah",
  hourlyCost: 36 + (index % 7) * 4,
  billingRate: 96 + (index % 8) * 12,
  onTime: Math.max(78, t[10] - (index % 3) * 2),
  correctionRate: 2 + (index % 5),
  safetyIncidents: index % 9 === 0 ? 1 : 0,
  auditFindings: index % 6,
  trainingNeeds: index % 4 === 0 ? ["Renewal planning", "Report photo checklist"] : ["Next credential pathway"],
  homeBase: index % 2 ? "Manassas yard" : "Springfield office",
  fieldStatus: fieldStatusFor(t[4], index),
  trackingSource: index % 6 === 0 ? "Personal phone opt-in" : index % 2 === 0 ? "Company-issued phone" : "Company vehicle",
  personalPhoneConsent: index % 6 === 0,
  inScheduledHours: !["Off duty", "Unavailable"].includes(t[4]) && index !== 14,
  onPto: index === 14,
  lastUpdatedMinutes: [3, 7, 12, 18, 28, 5, 9, 14, 41, 6, 11, 22, 8, 15, 0, 33, 4, 10, 16, 19][index],
  location: {
    label: ["Springfield corridor", "Route 29 westbound", "Arlington job zone", "I-66 service area", "DC Metro office", "Fairfax / Burke", "Potomac Yard", "Manassas lab", "Sterling yard", "Springfield office"][index % 10],
    nearestProject: projects[index % projects.length].name,
    x: 18 + ((index * 13) % 68),
    y: 20 + ((index * 17) % 58)
  }
}));

const workOrders = Array.from({ length: 30 }, (_, i) => {
  const service = serviceCatalog[i % serviceCatalog.length];
  const project = projects[i % projects.length];
  const assigned = [null, technicians[(i + 3) % technicians.length], technicians[(i + 7) % technicians.length]][i % 3];
  const statuses = ["Not assigned", "Assigned", "En route", "Onsite", "Testing", "Awaiting pickup", "Report pending", "Complete", "Problem / delayed"];
  const priorities = ["Normal", "High", "Urgent"];
  return {
    id: `WO-${2430 + i}`,
    projectId: project.id,
    project: project.name,
    requestedBy: ["Site superintendent", "Project manager", "Owner rep", "Lab manager"][i % 4],
    requestTime: `2026-06-${String(8 + (i % 5)).padStart(2, "0")} ${7 + (i % 10)}:00`,
    service: service[0],
    requiredTime: `2026-06-09 ${String(7 + (i % 9)).padStart(2, "0")}:30`,
    duration: `${2 + (i % 6)} hr`,
    location: project.address,
    scope: `${service[0]} for ${project.sector.toLowerCase()} activity area ${String.fromCharCode(65 + (i % 6))}.`,
    requiredCerts: service[1],
    requiredEquipment: service[2],
    techId: assigned ? assigned.id : null,
    technician: assigned ? assigned.name : "Unassigned",
    vehicle: assigned ? assigned.vehicle : "Unassigned",
    equipment: assigned ? assigned.equipment : "Unassigned",
    priority: priorities[i % priorities.length],
    status: i % 10 === 0 ? "Problem / delayed" : statuses[i % statuses.length],
    reportDue: `2026-06-${String(9 + (i % 8)).padStart(2, "0")}`,
    billingCode: ["CMT-FIELD", "SPECIAL-INSP", "LAB-PICKUP", "GEOTECH-FIELD"][i % 4],
    distanceSeed: 3 + ((i * 7) % 28)
  };
});

const equipment = Array.from({ length: 25 }, (_, i) => {
  const cats = ["Nuclear gauge", "Vehicle", "Air meter", "Slump cone", "Thermometer", "Cylinder molds", "DCP", "Drill rig", "Camera", "Field tablet", "Oven", "Sieve stack", "Proctor mold"];
  const statuses = ["Available", "Assigned", "In use", "In calibration", "Maintenance needed", "Out of service"];
  const category = cats[i % cats.length];
  const assigned = technicians[(i * 3) % technicians.length];
  return {
    id: `${category.split(" ").map(w => w[0]).join("")}-${180 + i}`,
    category,
    manufacturer: ["Troxler", "Humboldt", "Gilson", "Forney", "InstroTek", "Durham Geo"][i % 6],
    model: ["3000", "Elite", "XR", "FieldPro", "LX", "Utility"][i % 6],
    serial: `SN-${88 + i}-${String(4600 + i)}`,
    location: i % 4 === 0 ? "Main lab" : assigned.vehicle,
    assignedTech: i % 5 === 0 ? "Unassigned" : assigned.name,
    assignedProject: i % 3 === 0 ? projects[i % projects.length].name : "Pool",
    calibrationDue: `2026-0${6 + (i % 4)}-${String(5 + (i % 23)).padStart(2, "0")}`,
    condition: ["Good", "Good", "Fair", "Needs review"][i % 4],
    status: i % 11 === 0 ? "Maintenance needed" : statuses[i % statuses.length],
    notes: i % 7 === 0 ? "Calibration paperwork needs upload." : "Ready for dispatch."
  };
});

const demoTechnicians = [
  {
    id: "DT-01",
    name: "Maria Sanchez",
    branch: "Springfield",
    status: "Unavailable",
    distance: "Assigned call-out",
    schedule: "Called out for tomorrow morning",
    clearances: ["Site orientation"],
    equipmentAccess: ["Concrete field kit"],
    currentAssignment: "TRD-104",
    cascadingImpact: "No reassignment available because technician is unavailable.",
    certs: [
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 185 },
      { name: "Nuclear Gauge Safety", expiresIn: 94 }
    ]
  },
  {
    id: "DT-02",
    name: "Jamal Price",
    branch: "Springfield",
    status: "Available",
    distance: "18 min",
    schedule: "Open after 7:00 AM",
    currentRoute: "Riverside Medical Tower concrete pour",
    clearances: ["Site orientation"],
    equipmentAccess: ["Concrete field kit", "Troxler gauge"],
    currentAssignment: "TRD-101",
    cascadingImpact: "Moving Jamal would make TRD-101 lose its assigned concrete technician.",
    returningToOffice: true,
    availableForPickup: true,
    estimatedDistanceFromPickup: 4.8,
    estimatedExtraDriveTime: 12,
    certs: [
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 220 },
      { name: "WACEL Soils", expiresIn: 72 },
      { name: "Nuclear Gauge Safety", expiresIn: 64 }
    ]
  },
  {
    id: "DT-03",
    name: "Elena Wu",
    branch: "Manassas",
    status: "Available",
    distance: "24 min",
    schedule: "Shared Troxler gauge window",
    currentRoute: "I-66 Logistics Pad soil compaction",
    clearances: ["Site access confirmed"],
    equipmentAccess: ["Troxler gauge"],
    currentAssignment: "TRD-102",
    cascadingImpact: "Moving Elena would leave soil density work with a shared gauge warning.",
    returningToOffice: true,
    availableForPickup: true,
    estimatedDistanceFromPickup: 2.1,
    estimatedExtraDriveTime: 8,
    certs: [
      { name: "WACEL Soils", expiresIn: 21 },
      { name: "Nuclear Gauge Safety", expiresIn: 44 }
    ]
  },
  {
    id: "DT-04",
    name: "Marcus Lee",
    branch: "DC Metro",
    status: "Report Writing",
    distance: "36 min",
    schedule: "Can move after report handoff",
    currentRoute: "Capital Metro Station steel inspection",
    clearances: ["Site orientation"],
    equipmentAccess: ["Steel inspection kit"],
    currentAssignment: "",
    cascadingImpact: "Can support inspection backup after report handoff only.",
    returningToOffice: true,
    availableForPickup: false,
    estimatedDistanceFromPickup: 5.6,
    estimatedExtraDriveTime: 18,
    certs: [
      { name: "WACEL Masonry", expiresIn: 145 },
      { name: "ICC Structural Steel", expiresIn: 18 }
    ]
  },
  {
    id: "DT-05",
    name: "Olivia Grant",
    branch: "Springfield",
    status: "Available",
    distance: "15 min",
    schedule: "Open 8:00 AM to noon",
    currentRoute: "Old Town Charter School masonry grout inspection",
    clearances: ["Site orientation"],
    equipmentAccess: ["Masonry grout kit", "Concrete field kit"],
    currentAssignment: "TRD-103",
    cascadingImpact: "Moving Olivia would create a masonry grout inspection gap.",
    returningToOffice: true,
    availableForPickup: true,
    estimatedDistanceFromPickup: 2.4,
    estimatedExtraDriveTime: 10,
    certs: [
      { name: "WACEL Masonry", expiresIn: 250 },
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 39 }
    ]
  },
  {
    id: "DT-06",
    name: "Devon Reed",
    branch: "Springfield",
    status: "Available",
    distance: "12 min",
    schedule: "Available for direct coverage",
    currentRoute: "Dedicated pickup route after 2:00 PM",
    clearances: ["Site access confirmed"],
    equipmentAccess: ["Troxler gauge", "Concrete field kit"],
    currentAssignment: "TRD-106",
    cascadingImpact: "Moving Devon would leave Dulles Data Hall without soil density coverage.",
    returningToOffice: true,
    availableForPickup: true,
    estimatedDistanceFromPickup: 3.6,
    estimatedExtraDriveTime: 14,
    certs: [
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 310 },
      { name: "WACEL Soils", expiresIn: 96 },
      { name: "Nuclear Gauge Safety", expiresIn: 118 }
    ]
  },
  {
    id: "DT-07",
    name: "Nadia Coleman",
    branch: "Baltimore",
    status: "Available",
    distance: "62 min",
    schedule: "Other-office option",
    currentRoute: "Other-office inspection coverage",
    clearances: ["Site orientation"],
    equipmentAccess: ["Steel inspection kit", "Masonry grout kit"],
    currentAssignment: "",
    cascadingImpact: "Other-office dispatch adds travel time but does not break a local job.",
    returningToOffice: true,
    availableForPickup: false,
    estimatedDistanceFromPickup: 31.5,
    estimatedExtraDriveTime: 52,
    certs: [
      { name: "ICC Structural Steel", expiresIn: 110 },
      { name: "WACEL Masonry", expiresIn: 28 }
    ]
  },
  {
    id: "DT-08",
    name: "Maria Lopez",
    branch: "Springfield",
    status: "Available",
    distance: "10 min",
    schedule: "Open for emergency coverage before 8:00 AM",
    currentRoute: "Available from Springfield office",
    clearances: ["Site orientation", "Garage safety orientation"],
    equipmentAccess: ["Concrete field kit", "Troxler gauge"],
    currentAssignment: "",
    cascadingImpact: "No scheduled job breaks if reassigned.",
    returningToOffice: true,
    availableForPickup: true,
    estimatedDistanceFromPickup: 2.8,
    estimatedExtraDriveTime: 8,
    certs: [
      { name: "ACI Concrete Field Testing Technician Grade I", expiresIn: 260 },
      { name: "WACEL Soils", expiresIn: 120 },
      { name: "Nuclear Gauge Safety", expiresIn: 150 }
    ]
  }
];

const demoEquipment = [
  { id: "AM-09", category: "Air meter", name: "Air meter AM-09", status: "Available", calibrationDays: 92, location: "Springfield field cage" },
  { id: "AM-14", category: "Air meter", name: "Air meter AM-14", status: "Available", calibrationDays: 18, location: "Manassas truck 12" },
  { id: "TH-03", category: "Thermometer", name: "Humboldt field thermometer TH-03", status: "Available", calibrationDays: 75, location: "Springfield field cage" },
  { id: "SC-18", category: "Slump cone kit", name: "Slump cone kit SC-18", status: "Available", calibrationDays: 180, location: "Springfield field cage" },
  { id: "CM-44", category: "Cylinder molds", name: "Cylinder molds CM-44", status: "Available", calibrationDays: 120, location: "Springfield field cage" },
  { id: "NG-27", category: "Troxler gauge", name: "Troxler gauge NG-27", status: "Limited/shared", calibrationDays: 12, location: "Manassas yard" },
  { id: "NG-31", category: "Troxler gauge", name: "Troxler gauge NG-31", status: "Out of service", calibrationDays: -6, location: "Main lab hold shelf" },
  { id: "MK-07", category: "Masonry grout kit", name: "Masonry grout inspection kit MK-07", status: "Available", calibrationDays: 88, location: "Springfield field cage" },
  { id: "ST-22", category: "Steel inspection kit", name: "Structural steel inspection kit ST-22", status: "Available", calibrationDays: 145, location: "DC Metro office" }
];

const demoWorkOrders = [
  {
    id: "TRD-101",
    time: "7:00 AM",
    project: "Riverside Medical Tower",
    service: "Concrete Pour",
    location: "Arlington, VA",
    assignedTechId: "DT-02",
    requiredCerts: ["ACI Concrete Field Testing Technician Grade I"],
    requiredEquipment: ["Slump cone kit", "Air meter", "Thermometer", "Cylinder molds"],
    requiredClearance: ["Site orientation"],
    priority: "High",
    hasCylinders: true,
    cylinderType: "Field",
    cylinderCount: 6,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-12",
    scope: "Slab-on-metal-deck concrete placement with cylinders and slump/air testing."
  },
  {
    id: "TRD-102",
    time: "8:30 AM",
    project: "I-66 Logistics Pad",
    service: "Soil Density",
    location: "Manassas, VA",
    assignedTechId: "DT-03",
    requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
    requiredEquipment: ["Troxler gauge"],
    requiredClearance: ["Site access confirmed"],
    priority: "Normal",
    hasCylinders: false,
    cylinderType: "",
    cylinderCount: 0,
    pickupRequired: "No",
    pickupDueDate: "",
    scheduleWarning: "Troxler gauge is shared with an afternoon backfill inspection.",
    scope: "Nuclear density testing for stone base and utility trench backfill."
  },
  {
    id: "TRD-103",
    time: "9:00 AM",
    project: "Old Town Charter School",
    service: "Masonry Grout Inspection",
    location: "Alexandria, VA",
    assignedTechId: "DT-05",
    requiredCerts: ["WACEL Masonry"],
    requiredEquipment: ["Masonry grout kit"],
    requiredClearance: ["Site orientation"],
    priority: "Normal",
    hasCylinders: true,
    cylinderType: "Lab",
    cylinderCount: 4,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-12",
    scope: "Grout placement observation and sample coordination for CMU wall sequence."
  },
  {
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
    hasCylinders: true,
    cylinderType: "Field",
    cylinderCount: 8,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-12",
    scope: "Morning elevated-deck pour with truck window opening at 8:00 AM."
  },
  {
    id: "TRD-105",
    time: "10:00 AM",
    project: "Capital Metro Station",
    service: "Structural Steel Inspection",
    location: "Washington, DC",
    assignedTechId: "",
    requiredCerts: ["ICC Structural Steel"],
    requiredEquipment: ["Steel inspection kit"],
    requiredClearance: ["Metro security clearance"],
    priority: "High",
    hasCylinders: false,
    cylinderType: "",
    cylinderCount: 0,
    pickupRequired: "No",
    pickupDueDate: "",
    scope: "Structural steel bolting and member verification for canopy framing."
  },
  {
    id: "TRD-106",
    time: "1:00 PM",
    project: "Dulles Data Hall",
    service: "Soil Density",
    location: "Sterling, VA",
    assignedTechId: "DT-06",
    requiredCerts: ["WACEL Soils", "Nuclear Gauge Safety"],
    requiredEquipment: ["Troxler gauge"],
    requiredClearance: ["Site access confirmed"],
    priority: "Normal",
    hasCylinders: false,
    cylinderType: "",
    cylinderCount: 0,
    pickupRequired: "No",
    pickupDueDate: "",
    scope: "Subgrade and trench compaction checks ahead of concrete flatwork."
  }
];

const cylinderPickups = [
  {
    id: "CP-501",
    workOrderId: "TRD-101",
    projectName: "Riverside Medical Tower",
    jobLocation: "Arlington, VA",
    castDate: "2026-06-11",
    cylinderType: "Field",
    cylinderCount: 6,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-12",
    pickupStatus: "Assigned",
    assignedPickupTechnicianId: "DT-02",
    specialInstructions: "Field-cured cylinders are beside the west hoist. Bring crate labels back to Springfield lab.",
    readinessIssue: "Field cylinders on site, pickup due tomorrow, no pickup technician assigned."
  },
  {
    id: "CP-502",
    workOrderId: "TRD-103",
    projectName: "Old Town Charter School",
    jobLocation: "Alexandria, VA",
    castDate: "2026-06-10",
    cylinderType: "Lab",
    cylinderCount: 4,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-12",
    pickupStatus: "Assigned",
    assignedPickupTechnicianId: "DT-05",
    specialInstructions: "Lab-cured grout set should return with assigned technician if they come back to Springfield.",
    readinessIssue: "Lab-cured cylinders should return with assigned technician."
  },
  {
    id: "CP-503",
    workOrderId: "TRD-099",
    projectName: "West End Retail Pad",
    jobLocation: "Falls Church, VA",
    castDate: "2026-06-10",
    cylinderType: "Field",
    cylinderCount: 8,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-10",
    pickupStatus: "Overdue",
    assignedPickupTechnicianId: "",
    specialInstructions: "Field cylinders are stored in the curing box near deck level P3. Superintendent requires pickup before noon.",
    readinessIssue: "Field cylinders overdue for pickup."
  },
  {
    id: "CP-505",
    workOrderId: "TRD-104",
    projectName: "Potomac Crossing Garage",
    jobLocation: "Fairfax, VA",
    castDate: "2026-06-11",
    cylinderType: "Field",
    cylinderCount: 8,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-12",
    pickupStatus: "Assigned",
    assignedPickupTechnicianId: "DT-02",
    specialInstructions: "Pickup is already planned with the Springfield return route after reassignment coverage.",
    readinessIssue: "Future pickup assigned."
  },
  {
    id: "CP-504",
    workOrderId: "TRD-106",
    projectName: "Dulles Data Hall",
    jobLocation: "Sterling, VA",
    castDate: "2026-06-11",
    cylinderType: "Field",
    cylinderCount: 5,
    pickupRequired: "Yes",
    pickupDueDate: "2026-06-14",
    pickupStatus: "Assigned",
    assignedPickupTechnicianId: "DT-06",
    specialInstructions: "Future pickup; combine with Sterling return route if possible.",
    readinessIssue: "Future pickup assigned."
  }
];

const workforceRoleRequirements = {
  "Technician II": {
    path: "Field Path",
    requiredCertifications: ["ACI Concrete Field Testing Technician Grade I", "OSHA 10"],
    optionalCertifications: ["Nuclear Gauge Safety Training"],
    requiredExperienceMonths: 12,
    requiredTraining: ["Field safety orientation"],
    requiredPerformance: 82,
    requiredLeadership: [],
    capabilities: ["Routine concrete testing", "Cylinder pickup support"]
  },
  "Technician III": {
    path: "Field Path",
    requiredCertifications: ["ACI Concrete Field Testing Technician Grade I", "Nuclear Gauge Safety Training"],
    optionalCertifications: ["WACEL Soils"],
    requiredExperienceMonths: 24,
    requiredTraining: ["Radiation safety refresher"],
    requiredPerformance: 85,
    requiredLeadership: ["Mentor Technician I"],
    capabilities: ["Concrete testing", "Soil density assignments", "Independent field route"]
  },
  "Senior Technician": {
    path: "Field Path",
    requiredCertifications: ["ACI Concrete Field Testing Technician Grade I", "Nuclear Gauge Safety Training", "WACEL Soils"],
    optionalCertifications: ["WACEL Concrete"],
    requiredExperienceMonths: 36,
    requiredTraining: ["Client communication basics"],
    requiredPerformance: 88,
    requiredLeadership: ["Lead small field crew"],
    capabilities: ["DOT soil density assignments", "High-priority field coverage", "Technician mentoring"]
  },
  "Lead Technician": {
    path: "Field Path",
    requiredCertifications: ["ACI Concrete Field Testing Technician Grade I", "WACEL Soils", "WACEL Concrete", "OSHA 30"],
    optionalCertifications: ["NICET Soils"],
    requiredExperienceMonths: 54,
    requiredTraining: ["Field leadership"],
    requiredPerformance: 90,
    requiredLeadership: ["Train two junior technicians"],
    capabilities: ["Multi-crew field coordination", "Transportation project lead coverage"]
  },
  "Special Inspector I": {
    path: "Special Inspection Path",
    requiredCertifications: ["ICC Reinforced Concrete", "OSHA 10"],
    optionalCertifications: ["ICC Structural Masonry"],
    requiredExperienceMonths: 24,
    requiredTraining: ["Special inspection documentation"],
    requiredPerformance: 86,
    requiredLeadership: [],
    capabilities: ["Reinforced concrete special inspection", "Hospital and school inspection coverage"]
  },
  "Special Inspector II": {
    path: "Special Inspection Path",
    requiredCertifications: ["ICC Reinforced Concrete", "ICC Structural Steel and Bolting", "OSHA 30"],
    optionalCertifications: ["ICC Spray-Applied Fireproofing"],
    requiredExperienceMonths: 42,
    requiredTraining: ["Structural observation reporting"],
    requiredPerformance: 88,
    requiredLeadership: ["Coordinate with project superintendent"],
    capabilities: ["Structural steel inspection", "Complex vertical construction bids"]
  },
  "Senior Inspector": {
    path: "Special Inspection Path",
    requiredCertifications: ["ICC Reinforced Concrete", "ICC Structural Masonry", "ICC Structural Steel and Bolting", "OSHA 30"],
    optionalCertifications: ["ICC Spray-Applied Fireproofing"],
    requiredExperienceMonths: 60,
    requiredTraining: ["Inspector mentoring"],
    requiredPerformance: 90,
    requiredLeadership: ["Lead special inspection package"],
    capabilities: ["Chief inspector bench", "Multi-discipline inspection coverage"]
  },
  "Lab Technician II": {
    path: "Lab Path",
    requiredCertifications: ["ACI Concrete Strength Testing Technician", "ACI Aggregate Testing Technician"],
    optionalCertifications: ["WACEL Concrete"],
    requiredExperienceMonths: 18,
    requiredTraining: ["Lab safety refresher"],
    requiredPerformance: 84,
    requiredLeadership: [],
    capabilities: ["Concrete strength testing support", "Aggregate testing coverage"]
  },
  "Lab Supervisor": {
    path: "Lab Path",
    requiredCertifications: ["ACI Concrete Strength Testing Technician", "ACI Aggregate Testing Technician", "WACEL Concrete", "OSHA 30"],
    optionalCertifications: [],
    requiredExperienceMonths: 48,
    requiredTraining: ["Lab quality procedure review"],
    requiredPerformance: 88,
    requiredLeadership: ["Review junior lab technician work"],
    capabilities: ["Lab succession coverage", "Quality program continuity"]
  },
  "Field Supervisor": {
    path: "Management Path",
    requiredCertifications: ["ACI Concrete Field Testing Technician Grade I", "WACEL Soils", "OSHA 30"],
    optionalCertifications: ["NICET Soils"],
    requiredExperienceMonths: 72,
    requiredTraining: ["Crew planning", "Client escalation"],
    requiredPerformance: 90,
    requiredLeadership: ["Manage weekly field schedule"],
    capabilities: ["Branch field succession", "Reduced single-person schedule risk"]
  },
  "Assistant Project Manager": {
    path: "Management Path",
    requiredCertifications: ["ACI Concrete Field Testing Technician Grade I", "OSHA 30"],
    optionalCertifications: ["WACEL Soils", "ICC Reinforced Concrete"],
    requiredExperienceMonths: 60,
    requiredTraining: ["Project communication", "Scope review"],
    requiredPerformance: 88,
    requiredLeadership: ["Own client-ready work plan"],
    capabilities: ["PM bench strength", "Field-to-office succession path"]
  },
  "Project Manager": {
    path: "Management Path",
    requiredCertifications: ["OSHA 30"],
    optionalCertifications: ["ACI Concrete Field Testing Technician Grade I", "ICC Reinforced Concrete"],
    requiredExperienceMonths: 84,
    requiredTraining: ["Project financial awareness", "Client management"],
    requiredPerformance: 90,
    requiredLeadership: ["Manage project portfolio"],
    capabilities: ["Project delivery succession", "Higher manager leverage"]
  }
};

const careerPaths = [
  ["Field Path", ["Technician I", "Technician II", "Technician III", "Senior Technician", "Lead Technician", "Field Supervisor"]],
  ["Special Inspection Path", ["Technician II", "Special Inspector I", "Special Inspector II", "Senior Inspector", "Chief Inspector"]],
  ["Lab Path", ["Lab Technician I", "Lab Technician II", "Senior Lab Technician", "Lab Supervisor"]],
  ["Management Path", ["Senior Technician", "Assistant Project Manager", "Project Manager", "Operations Manager"]]
];

const workforceEmployees = [
  {
    id: "WFE-001",
    name: "Jordan Lee",
    currentRole: "Senior Technician",
    department: "Field Services",
    office: "Springfield",
    careerPath: "Special Inspection Path",
    nextRole: "Special Inspector II",
    experienceMonths: 54,
    performance: 91,
    completedTraining: ["Special inspection documentation", "Structural observation reporting"],
    leadership: ["Coordinate with project superintendent"],
    certifications: [
      ["ACI Concrete Field Testing Technician Grade I", "2027-01-18"],
      ["ICC Reinforced Concrete", "2026-11-05"],
      ["OSHA 30", "2028-03-20"]
    ],
    availability: "Available",
    businessImpact: "Would unlock structural steel inspection coverage for hospital and data center bids."
  },
  {
    id: "WFE-002",
    name: "Angela Brooks",
    currentRole: "Technician II",
    department: "Field Services",
    office: "Manassas",
    careerPath: "Field Path",
    nextRole: "Senior Technician",
    experienceMonths: 30,
    performance: 87,
    completedTraining: ["Radiation safety refresher", "Client communication basics"],
    leadership: ["Mentor Technician I"],
    certifications: [
      ["ACI Concrete Field Testing Technician Grade I", "2026-07-10"],
      ["Nuclear Gauge Safety Training", "2026-08-22"],
      ["OSHA 10", "2028-01-04"]
    ],
    availability: "Available",
    businessImpact: "Adding WACEL Soils reduces shortage risk for transportation and data center earthwork."
  },
  {
    id: "WFE-003",
    name: "Chris Patel",
    currentRole: "Lab Technician II",
    department: "Laboratory",
    office: "Springfield",
    careerPath: "Lab Path",
    nextRole: "Lab Supervisor",
    experienceMonths: 50,
    performance: 89,
    completedTraining: ["Lab safety refresher", "Lab quality procedure review"],
    leadership: ["Review junior lab technician work"],
    certifications: [
      ["ACI Concrete Strength Testing Technician", "2026-06-25"],
      ["ACI Aggregate Testing Technician", "2026-09-05"],
      ["WACEL Concrete", "2027-02-14"],
      ["OSHA 30", "2027-07-01"]
    ],
    availability: "Available",
    businessImpact: "Strengthens lab succession and reduces supervisor bottleneck risk."
  },
  {
    id: "WFE-004",
    name: "Maya Thompson",
    currentRole: "Technician II",
    department: "Field Services",
    office: "Springfield",
    careerPath: "Field Path",
    nextRole: "Senior Technician",
    experienceMonths: 18,
    performance: 86,
    completedTraining: ["Radiation safety refresher"],
    leadership: [],
    certifications: [
      ["ACI Concrete Field Testing Technician Grade I", "2027-04-12"],
      ["Nuclear Gauge Safety Training", "2026-12-18"],
      ["OSHA 10", "2028-02-11"]
    ],
    availability: "Available",
    businessImpact: "WACEL Soils plus experience would unlock DOT soil density assignments."
  },
  {
    id: "WFE-005",
    name: "Robert King",
    currentRole: "Special Inspector I",
    department: "Special Inspections",
    office: "DC Metro",
    careerPath: "Special Inspection Path",
    nextRole: "Senior Inspector",
    experienceMonths: 62,
    performance: 88,
    completedTraining: ["Special inspection documentation", "Inspector mentoring"],
    leadership: ["Lead special inspection package"],
    certifications: [
      ["ICC Reinforced Concrete", "2026-05-28"],
      ["ICC Structural Masonry", "2026-08-12"],
      ["OSHA 30", "2027-05-01"]
    ],
    availability: "Assigned",
    businessImpact: "Renewals protect hospital and school inspection commitments."
  },
  {
    id: "WFE-006",
    name: "Sofia Keller",
    currentRole: "Technician III",
    department: "Field Services",
    office: "Manassas",
    careerPath: "Field Path",
    nextRole: "Lead Technician",
    experienceMonths: 58,
    performance: 92,
    completedTraining: ["Field leadership", "Client communication basics"],
    leadership: ["Lead small field crew", "Train two junior technicians"],
    certifications: [
      ["ACI Concrete Field Testing Technician Grade I", "2026-10-18"],
      ["WACEL Soils", "2026-09-29"],
      ["WACEL Concrete", "2027-03-03"],
      ["OSHA 30", "2027-12-11"]
    ],
    availability: "Available",
    businessImpact: "Can support transportation field leadership and succession planning."
  },
  {
    id: "WFE-007",
    name: "Devon Reed",
    currentRole: "Technician I",
    department: "Field Services",
    office: "Springfield",
    careerPath: "Field Path",
    nextRole: "Technician II",
    experienceMonths: 9,
    performance: 83,
    completedTraining: ["Field safety orientation"],
    leadership: [],
    certifications: [
      ["ACI Concrete Field Testing Technician Grade I", "2026-08-01"],
      ["OSHA 10", "2028-06-01"]
    ],
    availability: "Available",
    businessImpact: "Keeps junior field route coverage growing without overloading senior technicians."
  },
  {
    id: "WFE-008",
    name: "Nadia Coleman",
    currentRole: "Senior Inspector",
    department: "Special Inspections",
    office: "Baltimore",
    careerPath: "Special Inspection Path",
    nextRole: "Chief Inspector",
    experienceMonths: 96,
    performance: 93,
    completedTraining: ["Inspector mentoring", "Structural observation reporting"],
    leadership: ["Lead special inspection package"],
    certifications: [
      ["ICC Reinforced Concrete", "2027-01-09"],
      ["ICC Structural Masonry", "2026-12-15"],
      ["ICC Structural Steel and Bolting", "2026-06-20"],
      ["ICC Spray-Applied Fireproofing", "2027-02-22"],
      ["OSHA 30", "2028-01-01"]
    ],
    availability: "Limited",
    businessImpact: "Only current internal structural steel bench; renewal protects bid readiness."
  }
];

const bidQualificationRequirements = [
  {
    project: "Hospital Expansion",
    status: "At Risk",
    requirements: [
      ["ACI Concrete Field Testing Technician Grade I", 2],
      ["ICC Reinforced Concrete", 1],
      ["ICC Structural Steel and Bolting", 1],
      ["WACEL Soils", 1]
    ],
    recommendation: "Prioritize ICC Structural Steel and Bolting for Jordan Lee; identify partner inspector for temporary coverage."
  },
  {
    project: "DOT Roadway Widening",
    status: "At Risk",
    requirements: [
      ["WACEL Soils", 3],
      ["Nuclear Gauge Safety Training", 3],
      ["NICET Soils", 1]
    ],
    recommendation: "Prioritize WACEL Soils for Angela Brooks and Maya Thompson; develop NICET Soils bench."
  },
  {
    project: "Data Center Foundation Package",
    status: "At Risk",
    requirements: [
      ["ACI Concrete Field Testing Technician Grade I", 3],
      ["WACEL Soils", 2],
      ["ICC Reinforced Concrete", 1]
    ],
    recommendation: "Promote Senior Technician coverage and confirm WACEL Soils bench before award."
  },
  {
    project: "School Addition",
    status: "Ready",
    requirements: [
      ["ACI Concrete Field Testing Technician Grade I", 1],
      ["ICC Structural Masonry", 1],
      ["WACEL Concrete", 1]
    ],
    recommendation: "Current bench can cover; monitor expiring ICC Structural Masonry."
  },
  {
    project: "Federal Security Project",
    status: "Cannot Fully Staff",
    requirements: [
      ["ICC Structural Steel and Bolting", 2],
      ["ICC Spray-Applied Fireproofing", 1],
      ["OSHA 30", 2]
    ],
    recommendation: "Add structural steel certification capacity and identify temporary partner coverage."
  }
];

const certifications = Array.from({ length: 40 }, (_, i) => {
  const tech = technicians[i % technicians.length];
  const type = certTypes[i % certTypes.length];
  const days = [-12, 18, 43, 78, 160, 280][i % 6];
  return {
    id: `CERT-${5100 + i}`,
    technician: tech.name,
    type,
    number: `${type.split(" ")[0].toUpperCase()}-${2020 + (i % 7)}-${100 + i}`,
    issuer: type.startsWith("ACI") ? "ACI" : type.startsWith("ICC") ? "ICC" : type.startsWith("WACEL") ? "WACEL" : "State / DOT",
    issue: `2024-${String(1 + (i % 12)).padStart(2, "0")}-12`,
    expirationDays: days,
    expiration: dateFromToday(days),
    status: days < 0 ? "Expired" : days <= 30 ? "Expiring soon" : "Active",
    verificationUrl: "Manual verification URL pending"
  };
});

const reports = Array.from({ length: 8 }, (_, i) => ({
  id: `RPT-${9300 + i}`,
  project: projects[i % projects.length].name,
  type: ["Field inspection", "Soil density", "Concrete testing", "Lab testing", "Boring log", "Special inspection"][i % 6],
  author: technicians[(i * 2) % technicians.length].name,
  status: ["Submitted by technician", "Under PM review", "Needs correction", "Draft"][i % 4],
  checks: ["Missing photo", "Expired certification check", "ASTM reference review", "Report late"][i % 4],
  health: ["Needs review", "High risk", "Complete"][i % 3]
}));

const concreteSets = Array.from({ length: 15 }, (_, i) => ({
  id: `CS-${700 + i}`,
  project: projects[i % projects.length].name,
  technician: technicians[(i + 5) % technicians.length].name,
  cast: `2026-05-${String(18 + (i % 12)).padStart(2, "0")}`,
  mix: `VA-${4000 + (i % 5) * 25}`,
  cylinders: 4 + (i % 3),
  breaksDue: i % 5 === 0 ? "Overdue" : i % 3 === 0 ? "Today" : "Scheduled",
  report: i % 4 === 0 ? "Lab manager review" : "Pending breaks"
}));

const soilTests = Array.from({ length: 10 }, (_, i) => ({
  id: `SOIL-${820 + i}`,
  project: projects[(i + 2) % projects.length].name,
  test: ["Proctor", "Atterberg limits", "Sieve analysis", "CBR", "Moisture content"][i % 5],
  status: ["In progress", "Pending review", "Awaiting sample", "Complete"][i % 4],
  due: `2026-06-${String(10 + i).padStart(2, "0")}`
}));

const borings = Array.from({ length: 6 }, (_, i) => ({
  id: `B-${101 + i}`,
  project: projects[(i + 1) % projects.length].name,
  driller: ["Crew A", "Crew B", "Crew C"][i % 3],
  rig: `Rig-${i % 3 + 1}`,
  depth: 35 + i * 12,
  groundwater: i % 2 ? "Not encountered" : `${9 + i} ft`,
  status: ["Pending review", "Drilling today", "Lab tests linked"][i % 3]
}));

function dateFromToday(days) {
  const date = new Date("2026-06-09T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fieldStatusFor(status, index) {
  const mapped = {
    "Available": "Available",
    "Assigned": "En Route",
    "En route": "En Route",
    "Onsite": "Onsite",
    "In lab": "Testing",
    "Report writing": "Report Writing",
    "On break": "Unavailable",
    "Off duty": "Off Duty",
    "Unavailable": "Unavailable"
  };
  return index === 8 || index === 15 ? "Poor Signal" : mapped[status] || "Unavailable";
}

function canViewFieldLocation() {
  return authorizedLocationRoles.has(state.role);
}

function locationVisibility(tech) {
  if (!canViewFieldLocation()) {
    return { visible: false, label: "Restricted", tone: "gray", reason: "Location access is limited to dispatch, branch management, and executive roles." };
  }
  if (tech.onPto || !tech.inScheduledHours || ["Off Duty", "Unavailable"].includes(tech.fieldStatus)) {
    return { visible: false, label: "Not tracked", tone: "gray", reason: "Off duty, PTO, unavailable, or outside scheduled working hours." };
  }
  if (tech.fieldStatus === "Poor Signal" || tech.lastUpdatedMinutes > 20) {
    return { visible: true, label: "Stale", tone: "warn", reason: "Last update is old or signal quality is poor." };
  }
  return { visible: true, label: "Current", tone: "good", reason: "Updated during scheduled working hours." };
}

function locationDistance(tech, order) {
  return 3 + ((Number(tech.id.slice(-2)) * 4 + order.distanceSeed) % 31);
}

function hasAll(values, required) {
  return required.every(item => values.some(value => value.toLowerCase() === item.toLowerCase()));
}

function hasActiveCert(values, required) {
  return required.every(item => values.some(value => value.toLowerCase() === item.toLowerCase() && !/expired/i.test(value)));
}

function missingItems(values, required) {
  return required.filter(item => !values.some(value => value.toLowerCase() === item.toLowerCase() && !/expired/i.test(value)));
}

function canCoverAssignment(candidate, assignment) {
  if (!assignment) return false;
  const certsOk = hasActiveCert(candidate.certs, assignment.requiredCerts);
  const equipmentOk = hasAll(candidate.equipment, assignment.requiredEquipment);
  const accessOk = hasAll(candidate.access, assignment.requiredAccess);
  const etaOk = candidate.distanceToMikeJob ? candidate.distanceToMikeJob <= 20 : candidate.distance <= 30;
  const available = candidate.status === "Available" || /available/i.test(candidate.availability);
  return certsOk && equipmentOk && accessOk && etaOk && available;
}

function analyzeEmergencyCandidate(candidate) {
  const missingCerts = missingItems(candidate.certs, emergencyRequest.requiredCerts);
  const missingAccess = missingItems(candidate.access, emergencyRequest.requiredAccess);
  const missingEquipment = missingItems(candidate.equipment, emergencyRequest.requiredEquipment);
  const qualified = missingCerts.length === 0 && missingAccess.length === 0 && missingEquipment.length === 0;
  const current = candidate.currentAssignment;
  let category = "Not Qualified";
  let score = qualified ? 70 : 20;
  let risk = qualified ? "Low" : "High";
  let coverage = null;
  let reason = "Does not meet all emergency requirements.";

  if (qualified) {
    score += Math.max(0, 35 - candidate.distance);
    if (candidate.status === "Available") {
      category = candidate.limitation ? "Backup With Risk" : "Best Direct Match";
      risk = candidate.limitation ? "Moderate" : "Low";
      reason = candidate.limitation || "Available, qualified, has secure access, and can reach the site inside the truck ETA.";
    } else if (current) {
      const replacement = emergencyTechnicians.find(other => other.name !== candidate.name && canCoverAssignment(other, current));
      coverage = replacement ? {
        replacement,
        uncovered: false,
        steps: [
          `Assign ${candidate.name} to ${emergencyRequest.project}.`,
          `Assign ${replacement.name} to ${candidate.name}'s ${current.service}.`,
          "No uncovered work remains."
        ]
      } : {
        replacement: null,
        uncovered: true,
        steps: ["No internal technician can cover this technician's current critical assignment."]
      };
      if (current.priority === "Critical" && replacement) {
        category = "Best Match With Coverage Plan";
        risk = "Moderate";
        reason = `${candidate.name} is qualified, but current critical work must be backfilled before reassignment.`;
        score -= 8;
      } else if (current.priority === "Critical") {
        category = "Backup With Risk";
        risk = "High";
        reason = "No internal technician can cover this technician's current critical assignment. Reassigning would leave another job uncovered.";
        score -= 35;
      } else {
        category = "Backup With Risk";
        risk = "Moderate";
        reason = "Current assignment is lower priority and may be movable with dispatcher approval.";
        score -= 15;
      }
    }
  }

  if (!qualified) {
    const gaps = [
      missingCerts.length ? `missing/expired certification: ${missingCerts.join(", ")}` : "",
      missingAccess.length ? `missing access: ${missingAccess.join(", ")}` : "",
      missingEquipment.length ? `missing equipment: ${missingEquipment.join(", ")}` : ""
    ].filter(Boolean);
    reason = gaps.join("; ");
  }

  return { candidate, qualified, category, score: Math.max(0, Math.min(100, Math.round(score))), risk, coverage, reason, missingCerts, missingAccess, missingEquipment };
}

function partnerMatchScore(partner) {
  const serviceMatch = partner.services.some(service => /concrete testing/i.test(service));
  const certMatch = partner.certifications.some(cert => /aci|wacel concrete/i.test(cert));
  const accessMatch = /yes|available|limited/i.test(partner.secureAccess);
  const regionMatch = /dc|va|virginia|dmv|maryland/i.test(partner.region);
  const responseOk = partner.responseMinutes <= 180;
  let score = 0;
  if (serviceMatch) score += 28;
  if (certMatch) score += 22;
  if (accessMatch) score += partner.secureAccess === "Yes" ? 18 : 12;
  if (regionMatch) score += 14;
  if (responseOk) score += 10;
  if (partner.status === "Active") score += 8;
  score += Math.round(partner.rating * 2);
  return { partner, score, serviceMatch, certMatch, accessMatch, regionMatch, responseOk };
}

function analyzeEmergencyDispatch() {
  const candidates = emergencyTechnicians
    .map(analyzeEmergencyCandidate)
    .sort((a, b) => b.score - a.score);
  const categories = ["Best Direct Match", "Best Match With Coverage Plan", "Backup With Risk", "Not Qualified"];
  const partners = approvedPartnerFirms
    .map(partnerMatchScore)
    .sort((a, b) => b.score - a.score);
  const bestPartner = partners.find(item => item.serviceMatch && item.certMatch && item.accessMatch && item.regionMatch && item.partner.status === "Active");
  const internalCoverageSafe = candidates.some(item => item.category === "Best Direct Match" || item.category === "Best Match With Coverage Plan");
  return { candidates, categories, partners, bestPartner, internalCoverageSafe };
}

function createEmergencyDecision(decisionType) {
  const analysis = analyzeEmergencyDispatch();
  const direct = analysis.candidates.find(item => item.category === "Best Direct Match");
  const coverage = analysis.candidates.find(item => item.category === "Best Match With Coverage Plan");
  const outsource = analysis.bestPartner;
  const fallback = analysis.candidates[0];
  const base = {
    id: `EDL-${String(state.emergencyDecisionLog.length + 1).padStart(3, "0")}`,
    timestamp: getDemoTimestamp(),
    role: state.role,
    emergencyWorkOrder: `${emergencyRequest.project} / ${emergencyRequest.service}`,
    required: `${emergencyRequest.requiredCerts.join(", ")} / ${emergencyRequest.requiredAccess.join(", ")}`,
    jobsAffected: [emergencyRequest.project],
    equipmentAffected: emergencyRequest.requiredEquipment,
    partnerFirm: "",
    assignedTechnician: "",
    replacementTechnician: "",
    remainingRisks: "Emergency request is last-minute; truck ETA is 90 minutes and site access must be confirmed.",
    statusAfterDecision: "Pending manager review"
  };

  if (decisionType === "direct" && direct) {
    return {
      ...base,
      decisionType: "Assign Direct Match",
      assignedTechnician: direct.candidate.name,
      reason: direct.reason,
      remainingRisks: "Low operational risk; confirm concrete kit and secure-site check-in before dispatch.",
      jobsAffected: [emergencyRequest.project],
      statusAfterDecision: `${direct.candidate.name} assigned to emergency concrete request.`
    };
  }

  if (decisionType === "coverage" && coverage) {
    const current = coverage.candidate.currentAssignment;
    return {
      ...base,
      decisionType: "Assign With Coverage Plan",
      assignedTechnician: coverage.candidate.name,
      replacementTechnician: coverage.coverage?.replacement?.name || "",
      reason: coverage.reason,
      remainingRisks: "Moderate risk; replacement must arrive before the critical rebar inspection start time.",
      jobsAffected: [emergencyRequest.project, current?.project || "Current covered assignment"].filter(Boolean),
      equipmentAffected: [...emergencyRequest.requiredEquipment, ...(current?.requiredEquipment || [])],
      statusAfterDecision: coverage.coverage?.replacement
        ? `${coverage.candidate.name} assigned to emergency request; ${coverage.coverage.replacement.name} assigned to ${current.service}.`
        : "Coverage plan requested but no replacement technician was found."
    };
  }

  if (decisionType === "outsource" && outsource) {
    return {
      ...base,
      decisionType: "Recommend Outsource",
      partnerFirm: outsource.partner.name,
      reason: `${outsource.partner.name} is the strongest approved partner match for concrete testing, regional coverage, active vendor status, and secure-site capability.`,
      remainingRisks: outsource.responseOk ? "Partner may still miss the 90-minute truck ETA; call immediately." : "Partner response time likely exceeds truck ETA.",
      jobsAffected: [emergencyRequest.project],
      statusAfterDecision: `${outsource.partner.name} recommended for outsource request.`
    };
  }

  return {
    ...base,
    decisionType: "Escalate to Branch Manager",
    assignedTechnician: fallback?.candidate?.name || "",
    replacementTechnician: coverage?.coverage?.replacement?.name || "",
    partnerFirm: outsource?.partner?.name || "",
    reason: "Dispatcher escalated because the emergency request may compete with critical scheduled work or partner response may exceed the truck ETA.",
    remainingRisks: "Manager decision needed: approve direct dispatch, approve coverage-chain reassignment, authorize outsource, or decline request.",
    jobsAffected: [emergencyRequest.project, ...analysis.candidates.filter(item => item.candidate.currentAssignment).map(item => item.candidate.currentAssignment.project)],
    equipmentAffected: [...new Set([...emergencyRequest.requiredEquipment, ...analysis.candidates.flatMap(item => item.candidate.currentAssignment?.requiredEquipment || [])])],
    statusAfterDecision: "Escalated to Branch Manager."
  };
}

function logEmergencyDecision(decisionType) {
  const entry = enrichDecisionEntry(createEmergencyDecision(decisionType));
  state.emergencyDecisionLog.unshift(entry);
  state.emergencyDecisionLog = state.emergencyDecisionLog.slice(0, 8);
  render();
}

function logLocationView(scope) {
  if (!canViewFieldLocation()) return;
  const minute = new Date().toISOString().slice(0, 16);
  const key = `${state.role}:${scope}:${minute}`;
  if (state.lastLocationLogKey === key) return;
  state.lastLocationLogKey = key;
  state.locationViewLog.unshift({
    role: state.role,
    scope,
    time: "Today, work hours",
    purpose: "Dispatch efficiency, safety, ETA accuracy, and reducing calls while technicians are driving or onsite"
  });
  state.locationViewLog = state.locationViewLog.slice(0, 6);
}

function toneForStatus(status) {
  if (/expired|overdue|problem|delayed|high risk|out of service|maintenance|at risk/i.test(status)) return "bad";
  if (/soon|pending|review|assigned|en route|attention|unbilled|draft|in progress|report writing|poor signal|stale/i.test(status)) return "warn";
  if (/active|available|complete|approved|current|onsite|testing|ready/i.test(status)) return "good";
  return "gray";
}

function toneForScore(score) {
  if (score >= 86) return "good";
  if (score >= 70) return "warn";
  return "bad";
}

function certMatch(tech, required) {
  const have = new Set(tech.certifications);
  return required.every(cert => have.has(cert));
}

function readinessScore(tech) {
  const certScore = Math.min(100, 70 + tech.certifications.length * 6);
  const workloadScore = Math.max(30, 100 - tech.workload * 0.55);
  const availabilityScore = ["Available", "Assigned", "En route"].includes(tech.status) ? 90 : tech.status === "Onsite" ? 70 : 45;
  const qualityScore = tech.quality;
  return Math.round(certScore * 0.32 + workloadScore * 0.22 + availabilityScore * 0.24 + qualityScore * 0.22);
}

function getDemoWorkOrder(id) {
  return demoWorkOrders.find(order => order.id === id) || demoWorkOrders[0];
}

function getDemoAssignedTech(order) {
  const assignedId = state.demoAssignments[order.id] ?? order.assignedTechId;
  return demoTechnicians.find(tech => tech.id === assignedId);
}

function getDemoCert(tech, required) {
  return tech?.certs.find(cert => cert.name === required);
}

function getDemoEquipmentOptions(required) {
  return demoEquipment.filter(item => item.category === required);
}

function getBestDemoEquipment(required) {
  const options = getDemoEquipmentOptions(required);
  const usable = options.filter(item => !["Out of service", "Unavailable"].includes(item.status) && item.calibrationDays >= 0);
  return (usable[0] || options[0] || null);
}

function getCylinderPickupForWorkOrder(workOrderId) {
  return cylinderPickups.find(pickup => pickup.workOrderId === workOrderId);
}

function getCylinderPickupAssignment(pickup) {
  return state.pickupAssignments[pickup.id] ?? pickup.assignedPickupTechnicianId;
}

function getPickupTechnician(pickup) {
  return demoTechnicians.find(tech => tech.id === getCylinderPickupAssignment(pickup));
}

function getPickupStatus(pickup) {
  if (["Picked Up", "Delivered to Lab"].includes(pickup.pickupStatus)) return pickup.pickupStatus;
  if (state.pickupAssignments[pickup.id] || pickup.assignedPickupTechnicianId) return "Assigned";
  if (pickup.pickupStatus === "Overdue") return "Overdue";
  return pickup.pickupStatus;
}

function dateCompare(a, b) {
  return new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime();
}

function evaluateCylinderPickup(pickup) {
  return getReadinessEngine().evaluatePickupReadiness(pickup, getReadinessEngineContext());
}

function getCylinderPickupMetrics() {
  const tomorrow = "2026-06-12";
  const evaluations = cylinderPickups.map(pickup => ({ pickup, evaluation: evaluateCylinderPickup(pickup) }));
  return {
    dueTomorrow: evaluations.filter(item => dateCompare(item.pickup.pickupDueDate, tomorrow) === 0).length,
    unassigned: evaluations.filter(item => !item.evaluation.assignedTech && item.pickup.pickupRequired === "Yes").length,
    overdue: evaluations.filter(item => item.evaluation.overdue && item.pickup.pickupRequired === "Yes").length
  };
}

function getCylinderReadinessIssues() {
  return cylinderPickups
    .map(pickup => ({ pickup, evaluation: evaluateCylinderPickup(pickup) }))
    .filter(item => item.evaluation.readiness !== "Ready" || item.evaluation.issues.some(issue => issue.includes("assigned")))
    .map(item => ({
      pickup: item.pickup,
      tone: item.evaluation.tone,
      status: item.evaluation.readiness,
      issue: item.evaluation.issues[0],
      assignedTech: item.evaluation.assignedTech
    }));
}

function getSelectedCylinderPickup() {
  return cylinderPickups.find(pickup => pickup.id === state.selectedCylinderPickup) || cylinderPickups[0];
}

function getPickupSuggestionText(tech, pickup, reason) {
  if (tech.id === "DT-03") return `${tech.name} - returning to lab after nearby soil compaction job, adds ${tech.estimatedExtraDriveTime} minutes.`;
  if (tech.id === "DT-05") return `${tech.name} - finishing inspection ${tech.estimatedDistanceFromPickup} miles away, available after 1:30 PM.`;
  if (tech.id === "DT-06") return `${tech.name} - dedicated pickup route available after 2 PM.`;
  return `${tech.name} - ${reason}, adds ${tech.estimatedExtraDriveTime || 18} minutes.`;
}

function getPickupSuggestions(pickup) {
  const order = demoWorkOrders.find(workOrder => workOrder.id === pickup.workOrderId);
  return demoTechnicians.map(tech => {
    const sameJob = order?.assignedTechId === tech.id || state.demoAssignments[order?.id] === tech.id;
    const returning = Boolean(tech.returningToOffice);
    const nearby = Number(tech.estimatedDistanceFromPickup || 99) <= 5;
    const available = tech.availableForPickup !== false && tech.status !== "Unavailable";
    const dedicated = tech.id === "DT-06";
    const extra = Number(tech.estimatedExtraDriveTime || 30);
    let score = 42;
    if (sameJob) score += 24;
    if (nearby) score += 18;
    if (returning) score += 16;
    if (dedicated) score += 14;
    if (available) score += 10;
    score -= Math.min(22, Math.round(extra / 2));
    if (!available) score -= 35;
    const reason = sameJob ? "same job technician can return cylinders with current assignment"
      : nearby ? "already near the pickup location"
      : returning ? "already returning to lab or office"
      : dedicated ? "dedicated pickup route"
      : "available as backup coverage";
    return {
      tech,
      score: Math.max(8, Math.min(99, score)),
      reason,
      explanation: getPickupSuggestionText(tech, pickup, reason),
      canAssign: available
    };
  }).sort((a, b) => b.score - a.score);
}

function getPickupRoutePreview() {
  const grouped = {};
  cylinderPickups.forEach(pickup => {
    const techId = getCylinderPickupAssignment(pickup);
    if (!techId) return;
    if (!grouped[techId]) grouped[techId] = [];
    grouped[techId].push(pickup);
  });
  const routeTechId = Object.keys(grouped).find(techId => grouped[techId].length > 1) || Object.keys(grouped)[0];
  if (!routeTechId) return null;
  const tech = demoTechnicians.find(item => item.id === routeTechId);
  const stops = grouped[routeTechId];
  return {
    tech,
    stops,
    orderedStops: ["Springfield Lab / Office", ...stops.map(stop => stop.projectName), "Springfield Lab / Office"],
    driveTime: 22 + stops.length * 11,
    stopCount: stops.length
  };
}

function daysUntilDate(date) {
  return Math.ceil((new Date(`${date}T12:00:00`).getTime() - new Date("2026-06-15T12:00:00").getTime()) / 86400000);
}

function getWorkforceCertificationRecords(employee) {
  return employee.certifications.map(([name, expiration]) => ({
    employeeId: employee.id,
    employee: employee.name,
    certification: name,
    expiration,
    daysRemaining: daysUntilDate(expiration),
    impact: certificationBusinessImpact(name)
  }));
}

function certificationUrgency(daysRemaining) {
  if (daysRemaining < 0) return { group: "Expired", tone: "bad", rank: 0 };
  if (daysRemaining <= 30) return { group: "Expiring in 30 days", tone: "bad", rank: 1 };
  if (daysRemaining <= 60) return { group: "Expiring in 60 days", tone: "warn", rank: 2 };
  if (daysRemaining <= 90) return { group: "Expiring in 90 days", tone: "warn", rank: 3 };
  return { group: "Current", tone: "good", rank: 4 };
}

function certificationBusinessImpact(certification) {
  const impacts = {
    "ICC Structural Steel and Bolting": "Required for structural steel inspection bids and federal/security projects.",
    "ICC Reinforced Concrete": "Required for hospital, school, and concrete special inspection coverage.",
    "WACEL Soils": "Supports DOT soil density and data center earthwork assignments.",
    "Nuclear Gauge Safety Training": "Required for nuclear density testing and soil compaction coverage.",
    "ACI Concrete Field Testing Technician Grade I": "Required for concrete pour coverage and cylinder casting readiness.",
    "ACI Concrete Strength Testing Technician": "Protects concrete lab continuity and supervisor bench strength.",
    "ICC Structural Masonry": "Required for masonry grout and school addition special inspection coverage.",
    "OSHA 30": "Supports lead, supervisor, and higher-risk project coverage."
  };
  return impacts[certification] || "Supports qualified staffing and bid readiness.";
}

function employeeCertNames(employee) {
  return new Set(employee.certifications.map(([name]) => name));
}

function getRoleRequirement(role) {
  return workforceRoleRequirements[role] || {
    path: "Unconfigured",
    requiredCertifications: [],
    optionalCertifications: [],
    requiredExperienceMonths: 0,
    requiredTraining: [],
    requiredPerformance: 0,
    requiredLeadership: [],
    capabilities: []
  };
}

function employeeQualificationProgress(employee) {
  const req = getRoleRequirement(employee.nextRole);
  const certs = employeeCertNames(employee);
  const completed = [];
  const missing = [];

  req.requiredCertifications.forEach(cert => {
    if (certs.has(cert)) completed.push(cert);
    else missing.push(cert);
  });
  req.requiredTraining.forEach(item => {
    if (employee.completedTraining.includes(item)) completed.push(item);
    else missing.push(item);
  });
  req.requiredLeadership.forEach(item => {
    if (employee.leadership.includes(item)) completed.push(item);
    else missing.push(item);
  });
  if (employee.experienceMonths >= req.requiredExperienceMonths) completed.push(`${req.requiredExperienceMonths} months experience`);
  else missing.push(`${req.requiredExperienceMonths - employee.experienceMonths} more months experience`);
  if (employee.performance >= req.requiredPerformance) completed.push(`${req.requiredPerformance}+ performance score`);
  else missing.push(`Performance score ${req.requiredPerformance}+`);

  const total = req.requiredCertifications.length + req.requiredTraining.length + req.requiredLeadership.length + 2;
  const progress = total ? Math.round((completed.length / total) * 100) : 100;
  const expiring = getWorkforceCertificationRecords(employee).filter(record => record.daysRemaining <= 90);
  let status = "Not Yet Eligible";
  if (missing.length === 0 && expiring.every(record => record.daysRemaining > 30)) status = "Promotion Ready";
  else if (expiring.some(record => record.daysRemaining <= 30)) status = "Expiring Soon";
  else if (missing.some(item => req.requiredCertifications.includes(item))) status = "Needs Training";
  else if (progress >= 70) status = "On Track";

  return {
    requirement: req,
    completed,
    missing,
    progress,
    status,
    expiring,
    tone: status === "Promotion Ready" ? "good" : ["On Track"].includes(status) ? "info" : status === "Not Yet Eligible" ? "gray" : status === "Expiring Soon" ? "bad" : "warn"
  };
}

function getQualifiedEmployeesFor(certification) {
  return workforceEmployees.filter(employee =>
    employee.availability !== "Unavailable"
    && employee.certifications.some(([name, expiration]) => name === certification && daysUntilDate(expiration) >= 0)
  );
}

function getProjectQualificationMatches(project) {
  const gaps = project.requirements.map(([certification, needed]) => {
    const available = getQualifiedEmployeesFor(certification).length;
    return {
      certification,
      needed,
      available,
      gap: Math.max(0, needed - available),
      status: available >= needed ? "Ready" : available > 0 ? "At Risk" : "Cannot Fully Staff"
    };
  });
  const status = gaps.some(gap => gap.status === "Cannot Fully Staff") ? "Not Ready" : gaps.some(gap => gap.status === "At Risk") ? "At Risk" : "Ready";
  return { ...project, gaps, computedStatus: status };
}

function getCriticalQualificationGaps() {
  return bidQualificationRequirements
    .map(getProjectQualificationMatches)
    .flatMap(project => project.gaps.filter(gap => gap.gap > 0).map(gap => ({ project: project.project, ...gap })));
}

function getWorkforceCertificationMonitor() {
  const records = workforceEmployees.flatMap(getWorkforceCertificationRecords)
    .map(record => ({ ...record, urgency: certificationUrgency(record.daysRemaining) }))
    .sort((a, b) => a.urgency.rank - b.urgency.rank || a.daysRemaining - b.daysRemaining);
  return ["Expired", "Expiring in 30 days", "Expiring in 60 days", "Expiring in 90 days", "Current"]
    .map(group => ({ group, records: records.filter(record => record.urgency.group === group) }));
}

function getTrainingPriorities() {
  const gaps = getCriticalQualificationGaps();
  const priorities = [];
  workforceEmployees.forEach(employee => {
    const progress = employeeQualificationProgress(employee);
    progress.missing.forEach(missing => {
      const gapCount = gaps.filter(gap => gap.certification === missing).reduce((sum, gap) => sum + gap.gap, 0);
      if (!workforceRoleRequirements[employee.nextRole]?.requiredCertifications.includes(missing)) return;
      const impactScore = gapCount * 30 + (progress.progress >= 65 ? 18 : 0) + (["ICC Structural Steel and Bolting", "WACEL Soils", "ICC Reinforced Concrete"].includes(missing) ? 18 : 0);
      priorities.push({
        employee,
        action: `Send ${employee.name} for ${missing} certification`,
        certification: missing,
        score: impactScore,
        reason: [
          gapCount ? `Current shortage: ${gapCount} open requirement${gapCount === 1 ? "" : "s"}` : "Supports career path readiness",
          `${employee.name} is ${progress.progress}% toward ${employee.nextRole}`,
          certificationBusinessImpact(missing)
        ]
      });
    });
    progress.expiring.forEach(record => {
      const score = record.daysRemaining < 0 ? 90 : record.daysRemaining <= 30 ? 70 : 45;
      priorities.push({
        employee,
        action: `Renew ${record.certification} for ${employee.name}`,
        certification: record.certification,
        score,
        reason: [`Expires in ${record.daysRemaining} days`, record.impact, "Reduces expired-certification staffing risk"]
      });
    });
  });
  return priorities.sort((a, b) => b.score - a.score).slice(0, 8);
}

function getWorkforceMetrics() {
  const progress = workforceEmployees.map(employeeQualificationProgress);
  const certRecords = workforceEmployees.flatMap(getWorkforceCertificationRecords);
  const criticalGaps = getCriticalQualificationGaps();
  const projectRisks = bidQualificationRequirements.map(getProjectQualificationMatches).filter(project => project.computedStatus !== "Ready");
  return {
    total: workforceEmployees.length,
    fullyQualified: progress.filter(item => item.missing.length === 0).length,
    exp30: certRecords.filter(record => record.daysRemaining >= 0 && record.daysRemaining <= 30).length,
    exp60: certRecords.filter(record => record.daysRemaining > 30 && record.daysRemaining <= 60).length,
    exp90: certRecords.filter(record => record.daysRemaining > 60 && record.daysRemaining <= 90).length,
    promotionReady: progress.filter(item => item.status === "Promotion Ready").length,
    criticalGaps: criticalGaps.length,
    staffingRisks: projectRisks.length,
    priorities: getTrainingPriorities().length
  };
}

function getWorkforceCriticalActions() {
  const training = getTrainingPriorities().slice(0, 3).map((priority, index) => ({
    title: priority.action,
    detail: priority.reason[0],
    tone: index === 0 ? "bad" : "warn",
    label: index === 0 ? "Do first" : "Next"
  }));
  const blockedProject = bidQualificationRequirements.map(getProjectQualificationMatches).find(project => project.computedStatus === "Not Ready");
  const projectAction = blockedProject ? [{
    title: `Assign backup coverage for ${blockedProject.project}`,
    detail: blockedProject.recommendation,
    tone: "bad",
    label: "Bid Risk"
  }] : [];
  const promotion = workforceEmployees
    .map(employee => ({ employee, progress: employeeQualificationProgress(employee) }))
    .find(item => item.progress.status === "Promotion Ready");
  const promotionAction = promotion ? [{
    title: `Review ${promotion.employee.name} for ${promotion.employee.nextRole}`,
    detail: "Promotion ready; use career path to support retention and succession planning.",
    tone: "good",
    label: "Promotion Ready"
  }] : [];
  return [...projectAction, ...training, ...promotionAction].slice(0, 5);
}

function evaluateDemoReadiness(order, candidateTechId = null) {
  return getReadinessEngine().evaluateWorkOrderReadiness(order, getReadinessEngineContext({ candidateTechId }));
}

function getDemoMetrics() {
  const evaluations = demoWorkOrders.map(order => evaluateDemoReadiness(order));
  return {
    total: evaluations.length,
    ready: evaluations.filter(item => item.status === "Ready").length,
    atRisk: evaluations.filter(item => item.status === "At Risk").length,
    notReady: evaluations.filter(item => item.status === "Not Ready").length,
    warnings: evaluations.reduce((sum, item) => sum + item.warnings.length, 0),
    blockers: evaluations.reduce((sum, item) => sum + item.blockers.length, 0)
  };
}

function getReadinessModule(issueText) {
  const text = issueText.toLowerCase();
  if (text.includes("certification") || text.includes("qualified") || text.includes("missing aci") || text.includes("missing wacel") || text.includes("missing icc")) return ["People Readiness", "technicians", "Missing Cert"];
  if (text.includes("cylinder") || text.includes("pickup")) return ["Cylinder Pickup Tracker", "demo", "Needs Assignment"];
  if (text.includes("no technician") || text.includes("unavailable") || text.includes("assigned") || text.includes("dispatch")) return ["Dispatch", "dispatch", "Needs Assignment"];
  if (text.includes("calibration") || text.includes("gauge") || text.includes("meter") || text.includes("equipment")) return ["Equipment Readiness", "equipment", "Equipment Risk"];
  if (text.includes("site") || text.includes("access") || text.includes("clearance") || text.includes("orientation") || text.includes("instructions")) return ["Dispatch", "dispatch", "Info Missing"];
  return ["Tomorrow Readiness", "demo", "At Risk"];
}

function getTomorrowReadinessData() {
  const jobs = demoWorkOrders.map(order => {
    const readiness = evaluateDemoReadiness(order);
    const blocker = readiness.blockers[0] || readiness.warnings[0] || "";
    const [module, page, label] = getReadinessModule(blocker);
    return { order, readiness, blocker, module, page, label };
  });
  const ready = jobs.filter(job => job.readiness.status === "Ready").length;
  const atRisk = jobs.filter(job => job.readiness.status === "At Risk").length;
  const notReady = jobs.filter(job => job.readiness.status === "Not Ready").length;
  const unassigned = jobs.filter(job => !job.readiness.assignedTech).length;
  const total = jobs.length;
  const score = Math.round(((ready + atRisk * 0.75) / Math.max(1, total)) * 100);
  const status = notReady || atRisk ? "At Risk" : "Ready";
  const tone = status === "Ready" ? "good" : status === "At Risk" ? "warn" : "bad";
  return { jobs, ready, atRisk, notReady, unassigned, total, score, status, tone };
}

function getCriticalReadinessIssues() {
  const orderIssues = getTomorrowReadinessData().jobs
    .flatMap(job => {
      const blockers = job.readiness.blockers.map(reason => ({ ...job, reason, severity: "Not Ready", tone: "bad" }));
      const warnings = job.readiness.warnings.map(reason => ({ ...job, reason, severity: "At Risk", tone: "warn" }));
      return [...blockers, ...warnings];
    });
  const pickupIssues = getCylinderReadinessIssues().filter(item => item.status !== "Ready").map(item => {
    const [module, page, label] = getReadinessModule(item.issue);
    return {
      order: {
        id: item.pickup.workOrderId,
        project: item.pickup.projectName,
        time: item.pickup.pickupDueDate,
        service: "Cylinder pickup",
        requiredCerts: [],
        requiredEquipment: [],
        technician: item.assignedTech?.name || "Unassigned"
      },
      readiness: { status: item.status },
      blocker: item.issue,
      reason: item.issue,
      module,
      page,
      label,
      severity: item.status === "Not Ready" ? "Not Ready" : "At Risk",
      tone: item.tone
    };
  });
  return [...orderIssues, ...pickupIssues]
    .sort((a, b) => (a.tone === "bad" ? 0 : 1) - (b.tone === "bad" ? 0 : 1))
    .slice(0, 7);
}

function getReadinessActionForIssue(issue) {
  const reason = issue.reason.toLowerCase();
  if (reason.includes("no technician") || reason.includes("unavailable")) return `Assign qualified technician to ${issue.order.id}`;
  if (reason.includes("missing") && reason.includes("certification")) return `Check People Readiness for ${issue.order.service}`;
  if (reason.includes("missing") && (reason.includes("clearance") || reason.includes("orientation") || reason.includes("access"))) return `Confirm clearance or find cleared coverage for ${issue.order.id}`;
  if (reason.includes("calibration") || reason.includes("gauge")) return `Replace or verify equipment for ${issue.order.id}`;
  if (reason.includes("cylinder") || reason.includes("pickup")) return `Assign cylinder pickup route for ${issue.order.project}`;
  if (reason.includes("shared")) return `Confirm backup equipment window for ${issue.order.id}`;
  return `Review ${issue.order.id} before dispatch is finalized`;
}

function getReadinessActionQueue() {
  const issueActions = getCriticalReadinessIssues().map(issue => ({
    title: getReadinessActionForIssue(issue),
    detail: issue.reason,
    tone: issue.tone,
    page: issue.page,
    label: issue.label
  }));
  const unique = [];
  issueActions.forEach(action => {
    if (!unique.some(existing => existing.title === action.title)) unique.push(action);
  });
  return unique.slice(0, 6);
}

function getReadinessDisplayStatus(status) {
  return status;
}

function getServiceDisplayName(service) {
  if (service === "Soil Density") return "Compaction";
  if (service === "Soil Compaction Test") return "Compaction";
  return service;
}

function getPrimaryReadinessGap(job) {
  return job.readiness.blockers[0] || job.readiness.warnings[0] || "";
}

function getReadinessGapSummary(job) {
  const count = job.readiness.blockers.length + job.readiness.warnings.length;
  if (!count) return "No Gaps";
  return `${count} ${count === 1 ? "Gap" : "Gaps"} - View`;
}

function getReadinessSortRank(status) {
  return { "Not Ready": 0, "At Risk": 1, Ready: 2 }[status] ?? 3;
}

function filterAndSortReadinessJobs(jobs, tableId = "tomorrowReadiness") {
  const readinessFilter = state.filters[`${tableId}:readiness`] || "All";
  const serviceFilter = state.filters[`${tableId}:service`] || "All";
  const techFilter = state.filters[`${tableId}:technician`] || "All";
  const sort = state.sorts[tableId]?.key || "time";
  const filtered = jobs.filter(job => {
    const techName = job.readiness.assignedTech?.name || "Unassigned";
    return (readinessFilter === "All" || job.readiness.status === readinessFilter)
      && (serviceFilter === "All" || getServiceDisplayName(job.order.service) === serviceFilter)
      && (techFilter === "All" || techName === techFilter);
  });
  return filtered.sort((a, b) => {
    if (sort === "readiness") return getReadinessSortRank(a.readiness.status) - getReadinessSortRank(b.readiness.status) || a.order.time.localeCompare(b.order.time);
    if (sort === "site") return a.order.location.localeCompare(b.order.location) || a.order.time.localeCompare(b.order.time);
    return a.order.time.localeCompare(b.order.time);
  });
}

function renderReadinessControls(jobs, tableId = "tomorrowReadiness") {
  const services = [...new Set(jobs.map(job => getServiceDisplayName(job.order.service)))];
  const techs = [...new Set(jobs.map(job => job.readiness.assignedTech?.name || "Unassigned"))];
  const filterValue = key => state.filters[`${tableId}:${key}`] || "All";
  const sortValue = state.sorts[tableId]?.key || "time";
  return `
    <div class="table-control-bar">
      <label>Filter By Readiness
        <select data-filter-key="${tableId}:readiness">
          ${["All", "Ready", "At Risk", "Not Ready"].map(value => `<option value="${value}" ${filterValue("readiness") === value ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </label>
      <label>Filter By Service Type
        <select data-filter-key="${tableId}:service">
          ${["All", ...services].map(value => `<option value="${value}" ${filterValue("service") === value ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </label>
      <label>Filter By Technician
        <select data-filter-key="${tableId}:technician">
          ${["All", ...techs].map(value => `<option value="${value}" ${filterValue("technician") === value ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </label>
      <label>Sort By
        <select data-sort-key="${tableId}">
          ${[["time", "Time"], ["readiness", "Readiness"], ["site", "Site"]].map(([value, label]) => `<option value="${value}" ${sortValue === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
    </div>
  `;
}

function renderReadinessGapDetails(job) {
  const primary = getPrimaryReadinessGap(job);
  const pickup = getCylinderPickupForWorkOrder(job.order.id);
  return `
    <details class="readiness-gap-details">
      <summary>${escapeHtml(getReadinessGapSummary(job))}</summary>
      <div class="readiness-gap-detail-grid">
        <div><span>Required Cert</span><strong>${renderSafeList(job.order.requiredCerts, "None")}</strong></div>
        <div><span>Required Equipment</span><strong>${renderSafeList(job.order.requiredEquipment, "None")}</strong></div>
        <div><span>Site Clearance</span><strong>${renderSafeList(job.order.requiredClearance, "Not Required")}</strong></div>
        <div><span>Pickup Need</span><strong>${pickup ? `${escapeHtml(pickup.cylinderCount)} ${escapeHtml(pickup.cylinderType)} Cylinders - ${escapeHtml(evaluateCylinderPickup(pickup).status)}` : "None"}</strong></div>
        <div class="wide"><span>Primary Gap</span><strong>${escapeHtml(primary || "No Readiness Gap")}</strong></div>
      </div>
    </details>
  `;
}

function renderAccordion(title, preview, body, options = {}) {
  return `
    <details class="readiness-accordion" ${options.open ? "open" : ""}>
      <summary>
        <span>
          <strong>${title}</strong>
          <em>${preview}</em>
        </span>
        <b>Open</b>
      </summary>
      <div class="readiness-accordion-body">
        ${body}
      </div>
    </details>
  `;
}

function getOpsCompression() {
  return window.CMTOperationalCompression;
}

function getPilotIntakeSafety() {
  const utility = window.CMTPilotIntakeSafety;
  if (!utility) throw new Error("CMTPilotIntakeSafety must load before app.js");
  return utility;
}

function getOpsContext(extra = {}) {
  return {
    generatedAt: getDemoTimestamp(),
    ...extra
  };
}

function renderCopyButton(text, label, tone = "ghost-button") {
  return `<button class="${tone}" type="button" data-copy-payload="${encodeURIComponent(text || "")}" data-copy-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function renderSafeList(values, empty = "None listed") {
  const items = Array.isArray(values) ? values : [values];
  const text = items.filter(item => item !== null && item !== undefined && String(item).trim()).map(String);
  return text.length ? text.map(escapeHtml).join(", ") : escapeHtml(empty);
}

function renderSafeText(value, fallback = "") {
  const text = value === null || value === undefined || value === "" ? fallback : value;
  return escapeHtml(String(text));
}

function renderOpsViewToggle() {
  return `
    <div class="ops-view-toggle" role="group" aria-label="Operational summary view">
      ${["compressed", "expanded"].map(mode => `
        <button class="${state.opsViewMode === mode ? "active" : ""}" type="button" data-ops-view-mode="${mode}">
          ${mode === "compressed" ? "Compressed View" : "Expanded View"}
        </button>
      `).join("")}
    </div>
  `;
}

function formatSourceValue(value) {
  if (Array.isArray(value)) return escapeHtml(value.length ? value.join(", ") : "None");
  if (value && typeof value === "object") return escapeHtml(JSON.stringify(value));
  return escapeHtml(String(value ?? "Not provided"));
}

function renderSourceDetails(summary, label = "Source Details") {
  const fields = Object.entries(summary.sourceFields || {})
    .filter(([, value]) => !(Array.isArray(value) && !value.length) && value !== undefined && value !== null && value !== "");
  return `
    <details class="source-details" ${state.opsViewMode === "expanded" ? "open" : ""}>
      <summary>
        <span>${escapeHtml(label)}</span>
        <span class="badge ${summary.stale ? "warn" : "good"}">${summary.stale ? "Stale" : "Current"}</span>
      </summary>
      <div class="source-detail-grid">
        ${fields.length ? fields.map(([key, value]) => `
          <div>
            <span>${escapeHtml(key)}</span>
            <strong>${formatSourceValue(value)}</strong>
          </div>
        `).join("") : `<div><span>Source</span><strong>No source fields listed.</strong></div>`}
        <div class="wide">
          <span>Source records</span>
          <strong>${summary.sourceRecords?.length ? summary.sourceRecords.map(escapeHtml).join(", ") : "None listed"} / ${escapeHtml(summary.sourceHash)}</strong>
        </div>
        <div class="wide">
          <span>Detail length estimate</span>
          <strong>${escapeHtml(summary.characterSavings.originalDetailLength)} source characters condensed to ${escapeHtml(summary.characterSavings.summaryLength)} summary characters (${escapeHtml(summary.characterSavings.percent)}% shorter).</strong>
        </div>
      </div>
    </details>
  `;
}

function renderSummaryList(title, items, empty = "None listed") {
  const values = (Array.isArray(items) ? items : [items]).filter(Boolean);
  return `
    <div class="ops-list-block">
      <span>${escapeHtml(title)}</span>
      ${values.length ? `<ul>${values.map(item => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>` : `<strong>${escapeHtml(empty)}</strong>`}
    </div>
  `;
}

function getRecommendedCoverageCandidate(order) {
  const candidates = getDemoCoverageCandidates(order);
  return candidates.find(candidate => candidate.canAssign && candidate.tech.name === "Maria Lopez")
    || candidates.find(candidate => candidate.canAssign)
    || candidates[0];
}

function createTomorrowOpsBriefSummary(readiness, issues, actions) {
  const trdOrder = getDemoWorkOrder("TRD-104");
  return getOpsCompression().createTomorrowOpsBrief(demoWorkOrders, demoTechnicians, demoEquipment, getOpsContext({
    jobs: readiness.jobs,
    counts: readiness,
    issues,
    actions,
    latestDecision: state.emergencyDecisionLog[0],
    recommendedCoverage: {
      workOrder: trdOrder,
      candidate: getRecommendedCoverageCandidate(trdOrder)
    }
  }));
}

function createWorkOrderPacketSummary(order, readiness, candidate) {
  return getOpsCompression().createWorkOrderReadinessPacket(order, getOpsContext({
    readiness,
    assignedTech: readiness.assignedTech,
    recommendedCandidate: candidate || getRecommendedCoverageCandidate(order),
    pickup: getCylinderPickupForWorkOrder(order.id)
  }));
}

function createCoverageHandoffSummary(order, readiness, candidate) {
  return getOpsCompression().createCoverageHandoffPacket(order, candidate?.tech || {}, getOpsContext({
    candidate,
    currentReadiness: readiness,
    afterReadiness: candidate?.evaluation || readiness
  }));
}

function createPilotIntakeSummary(importState) {
  const config = intakeEntityConfig[importState.entity];
  return getOpsCompression().createPilotIntakeSummary(importState.rows, importState.validation, getOpsContext({
    label: config.label
  }));
}

function createDecisionSummary(entry) {
  return entry.decisionSummary || getOpsCompression().createDecisionSummary(entry, getOpsContext({
    generatedAt: entry.timestamp
  }));
}

function getOpsImpact() {
  return window.CMTOperationalImpact;
}

function createOperationalImpactSnapshot() {
  const readiness = getTomorrowReadinessData();
  const importState = state.intakeImport;
  return getOpsImpact().createOperationalImpactSnapshot({
    generatedAt: getDemoTimestamp(),
    readinessJobs: readiness.jobs,
    counts: {
      ready: readiness.ready,
      atRisk: readiness.atRisk,
      notReady: readiness.notReady
    },
    equipment: demoEquipment,
    technicians: demoTechnicians,
    decisionLog: state.emergencyDecisionLog,
    importRows: importState?.rows || [],
    validationResults: importState?.validation || {}
  });
}

function renderImpactSourceDetails(sourceDetails, label = "How this was calculated") {
  const entries = Object.entries(sourceDetails || {});
  return `
    <details class="impact-source-details" ${state.opsViewMode === "expanded" ? "open" : ""}>
      <summary>${label}</summary>
      <div class="source-detail-grid">
        ${entries.length ? entries.map(([key, value]) => `
          <div class="${Array.isArray(value) || typeof value === "object" ? "wide" : ""}">
            <span>${escapeHtml(key)}</span>
            <strong>${formatSourceValue(value)}</strong>
          </div>
        `).join("") : `<div><span>Source</span><strong>No source details listed.</strong></div>`}
      </div>
    </details>
  `;
}

function impactTone(value) {
  if (/high|not ready|needs cleanup|bad/i.test(String(value))) return "bad";
  if (/medium|usable|at risk|warn/i.test(String(value))) return "warn";
  return "good";
}

function renderOperationalImpactSection(snapshot) {
  const topBottleneck = snapshot.coverageBottlenecks[0];
  const cards = [
    {
      label: "Readiness Issues Caught",
      value: snapshot.issuesCaughtBeforeTomorrow,
      tone: snapshot.issuesCaughtBeforeTomorrow ? "warn" : "good",
      detail: `${snapshot.issuesCaughtBeforeTomorrow} coverage, certification, equipment, or data gaps surfaced before dispatch.`
    },
    {
      label: "Manual Review Reduced",
      value: `${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow}-${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesHigh} min`,
      tone: "info",
      detail: "Conservative estimate from jobs, blockers, and decision records reviewed."
    },
    {
      label: "Highest Risk Work Order",
      value: snapshot.highestRiskWorkOrder.id,
      tone: impactTone(snapshot.highestRiskWorkOrder.status),
      detail: `${snapshot.highestRiskWorkOrder.reason} ${snapshot.highestRiskWorkOrder.recommendedFix}`
    },
    {
      label: "Repeat Blocker",
      value: snapshot.mostCommonBlockerType,
      tone: "warn",
      detail: "Most repeated readiness issue in the local schedule snapshot."
    },
    {
      label: "Coverage Bottleneck",
      value: topBottleneck ? topBottleneck.affectedServiceType : "None",
      tone: impactTone(topBottleneck?.riskLevel || "Low"),
      detail: topBottleneck ? `${topBottleneck.availableQualifiedTechCount} available qualified techs for ${topBottleneck.requiredCoverageCount} scheduled jobs.` : "No coverage bottleneck found in this snapshot."
    },
    {
      label: "Pilot Data Quality",
      value: `${snapshot.dataQualityScore.score}/100`,
      tone: impactTone(snapshot.dataQualityScore.gradeLabel),
      detail: `${snapshot.dataQualityScore.gradeLabel}. ${snapshot.dataQualityScore.recommendedCleanupActions[0] || "Source data is usable for this readiness demo."}`
    }
  ];
  return `
    <section class="panel operational-impact-panel" data-demo-target="operational-impact">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Operational Impact</p>
          <h2>Readiness Risk Caught Before Dispatch</h2>
          <p>Local estimates from tomorrow schedule data, certifications, equipment status, intake quality, and the decision log.</p>
        </div>
        <div class="panel-actions">
          ${renderOpsViewToggle()}
          ${renderCopyButton(snapshot.operationalImpactCopyText, "Copy Operational Impact Summary", "primary-button")}
        </div>
      </div>
      <div class="impact-card-grid">
        ${cards.map(card => `
          <article class="impact-card ${card.tone}">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(String(card.value))}</strong>
            <p>${escapeHtml(card.detail)}</p>
          </article>
        `).join("")}
      </div>
      ${renderPilotRoiSnapshot(snapshot)}
      <div class="impact-two-column">
        ${renderRepeatFailurePatterns(snapshot)}
        ${renderCoverageBottlenecks(snapshot)}
      </div>
      ${renderImpactSourceDetails(snapshot.sourceDetails)}
    </section>
  `;
}

function renderPilotRoiSnapshot(snapshot) {
  return `
    <article class="pilot-roi-panel" data-demo-target="pilot-roi-snapshot">
      <div class="ops-card-head">
        <div>
          <p class="eyebrow">Pilot ROI Snapshot</p>
          <h3>Pilot Impact Evidence</h3>
          <p>${escapeHtml(snapshot.pilotRoiSummary)}</p>
        </div>
        <div class="panel-actions">
          <span class="badge info">${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow}-${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesHigh} min est.</span>
          ${renderCopyButton(snapshot.pilotRoiCopyText, "Copy Pilot ROI Snapshot")}
        </div>
      </div>
      <div class="ops-summary-columns">
        ${renderSummaryList("Operational Value", [
          `${snapshot.issuesCaughtBeforeTomorrow} issues caught before tomorrow`,
          `${snapshot.totalJobsReviewed} scheduled jobs reviewed`,
          `${snapshot.highestRiskWorkOrder.id} identified as highest-risk work order`
        ])}
        ${renderSummaryList("Top Repeat Pattern", snapshot.repeatFailurePatterns[0] ? [
          snapshot.repeatFailurePatterns[0].title,
          snapshot.repeatFailurePatterns[0].recommendedFix
        ] : ["No repeat pattern detected yet."])}
        ${renderSummaryList("Recommended Manager Action", snapshot.recommendedManagerActions)}
      </div>
      ${renderImpactSourceDetails({
        "Pilot ROI summary": snapshot.pilotRoiSummary,
        "Estimated time savings": `${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow}-${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesHigh} minutes`,
        "Formula": snapshot.estimatedReviewTimeSavedMinutes.formulaDescription,
        "Top repeat pattern": snapshot.repeatFailurePatterns[0]?.title || "None",
        "Manager actions": snapshot.recommendedManagerActions
      }, "Pilot ROI Source Details")}
    </article>
  `;
}

function renderRepeatFailurePatterns(snapshot) {
  return `
    <section class="impact-subpanel">
      <div class="section-title compact">
        <div>
          <h2>Repeat Failure Patterns</h2>
          <p>Top repeated causes behind readiness problems.</p>
        </div>
        ${renderCopyButton(snapshot.repeatPatternCopyText, "Copy Repeat Pattern Report")}
      </div>
      <div class="impact-list">
        ${snapshot.repeatFailurePatterns.slice(0, 3).map(pattern => `
          <article class="impact-list-card">
            <div class="gap-card-head">
              <strong>${escapeHtml(pattern.title)}</strong>
              <span class="badge ${impactTone(pattern.severity)}">${pattern.severity} / ${pattern.count}</span>
            </div>
            <p>${escapeHtml(pattern.explanation)}</p>
            <div class="coverage-detail-grid compact-impact">
              <div><span>Affected Work Orders</span><strong>${pattern.affectedWorkOrders.length ? pattern.affectedWorkOrders.join(", ") : "None listed"}</strong></div>
              <div><span>Recommended Fix</span><strong>${escapeHtml(pattern.recommendedFix)}</strong></div>
            </div>
            ${renderImpactSourceDetails({ "Pattern source records": pattern.sourceDetails }, "Source Details")}
          </article>
        `).join("") || `<div class="empty-state">No repeat failure pattern detected in this snapshot.</div>`}
      </div>
    </section>
  `;
}

function renderCoverageBottlenecks(snapshot) {
  return `
    <section class="impact-subpanel">
      <div class="section-title compact">
        <div>
          <h2>Coverage Bottlenecks</h2>
          <p>Where bench strength is thin for tomorrow's work.</p>
        </div>
        ${renderCopyButton(snapshot.coverageBottleneckCopyText, "Copy Coverage Bottleneck Report")}
      </div>
      <div class="impact-list">
        ${snapshot.coverageBottlenecks.slice(0, 4).map(bottleneck => `
          <article class="impact-list-card">
            <div class="gap-card-head">
              <strong>${escapeHtml(bottleneck.affectedServiceType)}</strong>
              <span class="badge ${impactTone(bottleneck.riskLevel)}">${bottleneck.riskLevel}</span>
            </div>
            <div class="coverage-detail-grid compact-impact">
              <div><span>Qualified Available Techs</span><strong>${bottleneck.availableQualifiedTechCount}</strong></div>
              <div><span>Jobs Needing Coverage</span><strong>${bottleneck.jobsNeedingCoverageCount}</strong></div>
              <div><span>Scheduled Coverage Count</span><strong>${bottleneck.requiredCoverageCount}</strong></div>
              <div><span>Recommended Action</span><strong>${escapeHtml(bottleneck.recommendedAction)}</strong></div>
            </div>
            ${renderImpactSourceDetails({ "Affected work orders": bottleneck.affectedWorkOrders, "Coverage source": bottleneck.sourceDetails }, "Source Details")}
          </article>
        `).join("") || `<div class="empty-state">No coverage bottleneck detected in this snapshot.</div>`}
      </div>
    </section>
  `;
}

function renderDecisionImpactPanel(snapshot) {
  const latestDecision = state.emergencyDecisionLog[0];
  if (!latestDecision) return "";
  return `
    <section class="panel decision-impact-panel" data-demo-target="decision-impact-summary">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Operational Impact After Decision</p>
          <h2>${latestDecision.emergencyWorkOrder?.split(" / ")[0] || "Latest decision"} Impact</h2>
          <p>${escapeHtml(latestDecision.impactLanguage || snapshot.pilotRoiSummary)}</p>
        </div>
        <span class="badge ${snapshot.notReadyCount ? "warn" : "good"}">${snapshot.notReadyCount} Not Ready Remaining</span>
      </div>
      <div class="ops-summary-columns">
        ${renderSummaryList("Decision Impact", [latestDecision.impactLanguage || "Decision recorded in local log."])}
        ${renderSummaryList("Current Highest Risk", [`${snapshot.highestRiskWorkOrder.id}: ${snapshot.highestRiskWorkOrder.reason}`])}
        ${renderSummaryList("Next Manager Action", snapshot.recommendedManagerActions)}
      </div>
    </section>
  `;
}

function getPilotPack() {
  return window.CMTPilotReadinessPack;
}

function getPilotPackSummary() {
  return getPilotPack().createPilotMaterialsSummary({
    impactSnapshot: createOperationalImpactSnapshot()
  });
}

function renderPilotCopyCard(title, description, buttonLabel, copyText, badge = "Ready") {
  return `
    <article class="pilot-copy-card">
      <div>
        <span class="badge info">${escapeHtml(badge)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      ${renderCopyButton(copyText, buttonLabel, "ghost-button")}
    </article>
  `;
}

function renderPilotMaterialsSummary() {
  const summary = getPilotPackSummary();
  const items = [
    ["Highest-risk demo work order", summary.highestRiskWorkOrder, "bad"],
    ["Issues caught before tomorrow", summary.issuesCaughtBeforeTomorrow, "warn"],
    ["Estimated review time saved", summary.estimatedReviewTimeSaved, "info"],
    ["Top repeat failure pattern", summary.topRepeatFailurePattern, "warn"],
    ["Data quality grade", summary.dataQualityGrade, impactTone(summary.dataQualityGrade)],
    ["Recommended manager action", summary.recommendedManagerAction, "good"]
  ];
  return `
    <section class="pilot-materials-summary ops-docket">
      ${items.map(([label, value, tone]) => `
        <article>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
          <em class="badge ${tone}">${escapeHtml(tone === "info" ? "Estimate" : tone === "bad" ? "Risk" : tone === "warn" ? "Watch" : "Action")}</em>
        </article>
      `).join("")}
    </section>
  `;
}

function renderFounderChecklist() {
  const checklist = getPilotPack().founderChecklist;
  return `
    <section class="pilot-pack-section">
      <div class="section-title">
        <div>
          <h2>Founder Demo Checklist</h2>
          <p>Use this to run the manager conversation without losing the thread.</p>
        </div>
        ${renderCopyButton(getPilotPack().getFounderChecklistCopy(), "Copy Founder Checklist")}
      </div>
      <div class="pilot-pack-grid three">
        ${Object.entries(checklist).map(([key, items]) => `
          <article class="pilot-question-group">
            <h3>${key === "before" ? "Before the meeting" : key === "during" ? "During the meeting" : "After the meeting"}</h3>
            <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPilotQuestions() {
  const questions = getPilotPack().getPilotQualificationQuestions();
  const copyMap = {
    owner: "Copy Owner Questions",
    operations: "Copy Operations Questions",
    pm: "Copy PM Questions",
    lab: "Copy Lab/Equipment Questions"
  };
  return `
    <section class="pilot-pack-section">
      <div class="section-title">
        <div>
          <h2>Pilot Qualification Questions</h2>
          <p>Question bank grouped by buyer role.</p>
        </div>
        ${renderCopyButton(getPilotPack().getQuestionCopy("all"), "Copy All Questions")}
      </div>
      <div class="pilot-pack-grid two">
        ${Object.entries(questions).map(([key, group]) => `
          <article class="pilot-question-group">
            <div class="pilot-group-head">
              <h3>${escapeHtml(group.label)}</h3>
              ${renderCopyButton(getPilotPack().getQuestionCopy(key), copyMap[key] || "Copy Questions")}
            </div>
            <ol>${group.questions.map(question => `<li>${escapeHtml(question)}</li>`).join("")}</ol>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPilotDataRequestSection() {
  const data = getPilotPack().minimumData;
  const groups = [
    ["Work orders / schedule", data.workOrders],
    ["Technicians", data.technicians],
    ["Equipment", data.equipment],
    ["Optional fields", data.optional],
    ["Data not needed", data.notNeeded]
  ];
  return `
    <section class="pilot-pack-section">
      <div class="section-title">
        <div>
          <h2>Pilot Data Request</h2>
          <p>Start with a limited, anonymized export. Payroll, pricing, client financials, employee personal data, and sensitive HR data are not needed.</p>
        </div>
        ${renderCopyButton(getPilotPack().getPilotDataRequestCopy(), "Copy Pilot Data Request", "primary-button")}
      </div>
      <div class="pilot-pack-grid ${groups.length > 4 ? "five" : "two"}">
        ${groups.map(([title, items]) => `
          <article class="pilot-question-group ${title === "Data not needed" ? "out-of-scope" : ""}">
            <h3>${escapeHtml(title)}</h3>
            <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPilotSuccessCriteria() {
  return `
    <section class="pilot-pack-section">
      <div class="section-title">
        <div>
          <h2>Pilot Success Criteria</h2>
          <p>Measurable 2-4 week criteria for a credible pilot.</p>
        </div>
        ${renderCopyButton(getPilotPack().getPilotSuccessCriteriaCopy(), "Copy Success Criteria")}
      </div>
      <div class="pilot-pack-grid two">
        <article class="pilot-question-group">
          <h3>2-4 Week Success Criteria</h3>
          <ul>${getPilotPack().successCriteria.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <article class="pilot-question-group">
          <h3>Suggested Pilot Metrics</h3>
          <ul>${getPilotPack().pilotMetrics.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
      </div>
    </section>
  `;
}

function renderObjectionHandling() {
  return `
    <section class="pilot-pack-section">
      <div class="section-title">
        <div>
          <h2>Objection Handling</h2>
          <p>Grounded responses for likely manager concerns.</p>
        </div>
        <div class="panel-actions">
          ${renderCopyButton(getPilotPack().getObjectionHandlingCopy(false), "Copy All Objections")}
          ${renderCopyButton(getPilotPack().getObjectionHandlingCopy(true), "Copy Short Objection Responses")}
        </div>
      </div>
      <div class="pilot-pack-grid two">
        ${getPilotPack().objections.map(item => `
          <article class="pilot-copy-card objection">
            <div>
              <h3>${escapeHtml(item.objection)}</h3>
              <p>${escapeHtml(item.response)}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPilotMessageLibrary() {
  const context = { impactSnapshot: createOperationalImpactSnapshot() };
  return `
    <section class="pilot-pack-section">
      <div class="section-title">
        <div>
          <h2>Copyable Messages</h2>
          <p>Plain text for outreach, follow-up, and internal pilot approval.</p>
        </div>
      </div>
      <div class="pilot-pack-grid two">
        ${renderPilotCopyCard("Manager Email", "Short note that frames the tomorrow-readiness problem.", "Copy Manager Email", getPilotPack().getManagerEmailCopy(), "Pre-demo")}
        ${renderPilotCopyCard("Post-Demo Follow-Up", "Recap, anonymized data ask, and next step.", "Copy Post-Demo Follow-Up", getPilotPack().getPostDemoFollowUpCopy(context), "After demo")}
        ${renderPilotCopyCard("One-Page Business Case", "Internal pilot case for an owner, branch manager, or operations manager.", "Copy One-Page Business Case", getPilotPack().getOnePageBusinessCaseCopy(context), "Business case")}
      </div>
    </section>
  `;
}

function renderPilotScorecard() {
  return `
    <section class="pilot-pack-section pilot-scorecard">
      <div class="section-title">
        <div>
          <h2>Demo Scorecard</h2>
          <p>Use this after a meeting to qualify whether there is a real pilot opportunity.</p>
        </div>
        <div class="panel-actions">
          ${renderCopyButton(getPilotPack().getDemoScorecardCopy(state.pilotScorecard), "Copy Demo Scorecard")}
          <button class="ghost-button" type="button" data-reset-scorecard>Reset Scorecard</button>
        </div>
      </div>
      <div class="pilot-scorecard-list">
        ${getPilotPack().scorecardItems.map((item, index) => {
          const key = `score-${index}`;
          return `
            <label class="scorecard-item">
              <input type="checkbox" data-scorecard-key="${key}" ${state.pilotScorecard[key] ? "checked" : ""}>
              <span>${escapeHtml(item)}</span>
            </label>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPilotReadinessPack() {
  const context = { impactSnapshot: createOperationalImpactSnapshot() };
  return `
    <section class="pilot-pack">
      <section class="panel pilot-pack-hero">
        <div>
          <p class="eyebrow">Pilot Readiness Pack</p>
          <h2>Founder packet for a limited pilot.</h2>
          <p>Use this operating packet to discuss tomorrow readiness, coverage gaps, data quality, decision records, and pilot evidence without broadening the product scope.</p>
        </div>
        <div class="pilot-pack-actions">
          <button class="primary-button" type="button" data-start-walkthrough>Start Demo Walkthrough</button>
          ${renderCopyButton(getPilotPack().getManagerEmailCopy(), "Copy Manager Email")}
          ${renderCopyButton(getPilotPack().getPilotDataRequestCopy(), "Copy Pilot Data Request")}
          ${renderCopyButton(getPilotPack().getOnePageBusinessCaseCopy(context), "Copy One-Page Business Case")}
          ${renderCopyButton(getPilotPack().getPostDemoFollowUpCopy(context), "Copy Post-Demo Follow-Up")}
        </div>
      </section>
      ${renderPilotMaterialsSummary()}
      ${renderFounderChecklist()}
      ${renderPilotQuestions()}
      ${renderPilotDataRequestSection()}
      ${renderPilotSuccessCriteria()}
      ${renderObjectionHandling()}
      ${renderPilotMessageLibrary()}
      ${renderPilotScorecard()}
    </section>
  `;
}

function getDemoControl() {
  return window.CMTDemoControlCenter;
}

function getDemoControlRequiredUtilities() {
  return {
    readinessEngine: getReadinessEngine(),
    operationalCompression: getOpsCompression(),
    operationalImpact: getOpsImpact(),
    demoWalkthrough: getDemoWalkthrough(),
    pilotReadinessPack: getPilotPack(),
    pilotIntakeSafety: getPilotIntakeSafety()
  };
}

function getDemoControlStorageSnapshot() {
  return getDemoShared().getNamespacedStorageSnapshot();
}

function getWalkthroughTargetRegistry() {
  return getDemoWalkthrough().getSteps().reduce((acc, step) => {
    if (step.target) acc[step.target] = { page: step.page, stepId: step.id, title: step.title };
    return acc;
  }, {});
}

function isTRD104Approved() {
  return Boolean(state.demoDecision?.technician === "Maria Lopez"
    || state.emergencyDecisionLog.some(entry => entry.assignedTechnician === "Maria Lopez" && /TRD-104/.test(entry.emergencyWorkOrder || "")));
}

function createDemoDecisionSummaryPreview(order, readiness, candidate) {
  const existing = state.emergencyDecisionLog.find(entry => /TRD-104/.test(entry.emergencyWorkOrder || ""));
  if (existing) return createDecisionSummary(existing).copyText;
  const techName = candidate?.tech?.name || "Maria Lopez";
  const preview = {
    id: "EDL-PREVIEW",
    timestamp: getDemoTimestamp(),
    role: state.role,
    emergencyWorkOrder: `${order.id} / ${order.project}`,
    decisionType: "Approve Coverage",
    issue: readiness.reasons?.join(" ") || readiness.blockers?.join(" ") || "TRD-104 needs qualified coverage.",
    recommendedAction: `Assign ${techName} to ${order.id}`,
    approvedAction: `Approved ${techName} for ${order.service}`,
    assignedTechnician: techName,
    required: `${order.requiredCerts.join(", ")} / ${order.requiredClearance.join(", ")}`,
    reason: `${techName} has the required certification, clearance, equipment access, and availability for this demo coverage plan.`,
    readinessChecksUsed: ["Availability", "Certifications", "Clearance", "Equipment calibration", "Cascading impact"],
    beforeStatus: readiness.status,
    afterStatus: "Ready",
    statusAfterDecision: `${order.id} would move from ${readiness.status} to Ready.`,
    impactLanguage: `Impact: approving ${techName} resolves the TRD-104 coverage blocker for tomorrow.`
  };
  return getOpsCompression().createDecisionSummary(preview, getOpsContext({ generatedAt: preview.timestamp })).copyText;
}

function getDemoControlCopyMaterials(impactSnapshot = createOperationalImpactSnapshot()) {
  const readiness = getTomorrowReadinessData();
  const issues = getCriticalReadinessIssues();
  const actions = getReadinessActionQueue();
  const opsBrief = createTomorrowOpsBriefSummary(readiness, issues, actions);
  const trdOrder = getDemoWorkOrder("TRD-104");
  const trdReadiness = evaluateDemoReadiness(trdOrder);
  const mariaCandidate = getDemoCoverageCandidates(trdOrder).find(candidate => candidate.tech.name === "Maria Lopez") || getRecommendedCoverageCandidate(trdOrder);
  const packet = createWorkOrderPacketSummary(trdOrder, trdReadiness, mariaCandidate);
  const handoff = createCoverageHandoffSummary(trdOrder, trdReadiness, mariaCandidate);
  const pilotContext = { impactSnapshot };
  return [
    { id: "tomorrowOpsBrief", label: "Tomorrow Ops Brief copy", text: opsBrief.copyText, source: "Tomorrow Readiness" },
    { id: "workOrderReadinessPacket", label: "Work Order Readiness Packet copy", text: packet.copyText, source: "TRD-104 Readiness Packet" },
    { id: "coverageHandoff", label: "Coverage Handoff copy", text: handoff.copyText, source: "Maria Lopez Handoff" },
    { id: "decisionSummary", label: "Decision Summary copy", text: createDemoDecisionSummaryPreview(trdOrder, trdReadiness, mariaCandidate), source: "Decision Summary preview" },
    { id: "operationalImpactSummary", label: "Operational Impact Summary copy", text: impactSnapshot.operationalImpactCopyText, source: "Operational Impact" },
    { id: "pilotRoiSnapshot", label: "Pilot ROI Snapshot copy", text: impactSnapshot.pilotRoiCopyText, source: "Pilot ROI Snapshot" },
    { id: "demoRecap", label: "Demo Recap copy", text: getDemoRecapText(), source: "Pilot Story Mode" },
    { id: "managerEmail", label: "Manager Email copy", text: getPilotPack().getManagerEmailCopy(), source: "Pilot Materials" },
    { id: "pilotDataRequest", label: "Pilot Data Request copy", text: getPilotPack().getPilotDataRequestCopy(), source: "Pilot Materials" },
    { id: "onePageBusinessCase", label: "One-Page Business Case copy", text: getPilotPack().getOnePageBusinessCaseCopy(pilotContext), source: "Pilot Materials" },
    { id: "postDemoFollowUp", label: "Post-Demo Follow-Up copy", text: getPilotPack().getPostDemoFollowUpCopy(pilotContext), source: "Pilot Materials" },
    { id: "founderChecklist", label: "Founder Checklist copy", text: getPilotPack().getFounderChecklistCopy(), source: "Pilot Materials" },
    { id: "demoScorecard", label: "Demo Scorecard copy", text: getPilotPack().getDemoScorecardCopy(state.pilotScorecard), source: "Pilot Materials" }
  ];
}

function getDemoControlPilotMaterials(impactSnapshot = createOperationalImpactSnapshot()) {
  const summary = getPilotPack().createPilotMaterialsSummary({ impactSnapshot });
  return {
    summary: {
      text: [
        "Pilot Materials Summary",
        `Highest-risk work order: ${summary.highestRiskWorkOrder}`,
        `Issues caught before tomorrow: ${summary.issuesCaughtBeforeTomorrow}`,
        `Estimated review time saved: ${summary.estimatedReviewTimeSaved}`,
        `Top repeat failure pattern: ${summary.topRepeatFailurePattern}`,
        `Recommended manager action: ${summary.recommendedManagerAction}`
      ].join("\n")
    },
    founderChecklist: { text: getPilotPack().getFounderChecklistCopy() },
    qualificationQuestions: { text: getPilotPack().getQuestionCopy("all") },
    dataRequest: { text: getPilotPack().getPilotDataRequestCopy() },
    successCriteria: { text: getPilotPack().getPilotSuccessCriteriaCopy() },
    objectionHandling: { text: getPilotPack().getObjectionHandlingCopy(false) },
    managerEmail: { text: getPilotPack().getManagerEmailCopy() },
    postDemoFollowUp: { text: getPilotPack().getPostDemoFollowUpCopy({ impactSnapshot }) },
    onePageBusinessCase: { text: getPilotPack().getOnePageBusinessCaseCopy({ impactSnapshot }) },
    demoScorecard: { text: getPilotPack().getDemoScorecardCopy(state.pilotScorecard) }
  };
}

function getDemoControlContext() {
  const impactSnapshot = createOperationalImpactSnapshot();
  const trdOrder = getDemoWorkOrder("TRD-104");
  const trdReadiness = evaluateDemoReadiness(trdOrder);
  const mariaCandidate = getDemoCoverageCandidates(trdOrder).find(candidate => candidate.tech.name === "Maria Lopez") || getRecommendedCoverageCandidate(trdOrder);
  return {
    generatedAt: getDemoTimestamp(),
    requiredUtilities: getDemoControlRequiredUtilities(),
    trd104: {
      order: trdOrder,
      readiness: trdReadiness,
      mariaCandidate,
      canRecordDecisionLog: true,
      impactSnapshot
    },
    impactSnapshot,
    decisionLog: state.emergencyDecisionLog,
    canRecordDecisionLog: true,
    copyMaterials: getDemoControlCopyMaterials(impactSnapshot),
    pilotPack: getPilotPack(),
    pilotMaterials: getDemoControlPilotMaterials(impactSnapshot),
    pages,
    pageLabels,
    walkthroughSteps: getDemoWalkthrough().getSteps(),
    walkthroughTargetRegistry: getWalkthroughTargetRegistry(),
    document,
    storageSnapshot: getDemoControlStorageSnapshot(),
    localState: {
      selectedPage: pageLabels[state.activePage] || state.activePage,
      activePage: state.activePage,
      uiMode: state.uiMode,
      theme: state.theme,
      walkthroughActive: state.isWalkthroughActive,
      walkthroughCompleted: Boolean(state.walkthroughCompletedAt),
      walkthroughSkipped: state.walkthroughWasSkipped,
      trd104Approved: isTRD104Approved(),
      decisionLogEntryCount: state.emergencyDecisionLog.length,
      scorecardCheckedCount: Object.values(state.pilotScorecard).filter(Boolean).length
    }
  };
}

function qaTone(status) {
  if (status === "pass") return "good";
  if (status === "warn") return "warn";
  return "bad";
}

function qaStatusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "warn") return "Warn";
  return "Fail";
}

function renderQaStatusBadge(status, label = qaStatusLabel(status)) {
  return `<span class="qa-status-badge ${qaTone(status)}">${escapeHtml(label)}</span>`;
}

function renderQaSourceDetails(sourceDetails = {}) {
  const entries = Object.entries(sourceDetails).slice(0, 8);
  if (!entries.length) return "";
  return `
    <details class="qa-source-details">
      <summary>Source details</summary>
      <div class="source-detail-grid">
        ${entries.map(([key, value]) => `
          <div class="${Array.isArray(value) || typeof value === "object" ? "wide" : ""}">
            <span>${escapeHtml(String(key))}</span>
            <strong>${formatSourceValue(value)}</strong>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderQaCheckRows(checks) {
  return `
    <div class="qa-check-list">
      ${checks.map(check => `
        <article class="qa-check-row ${qaTone(check.status)}">
          <div class="qa-check-main">
            ${renderQaStatusBadge(check.status)}
            <div>
              <strong>${escapeHtml(check.label)}</strong>
              <p>${escapeHtml(check.summary)}</p>
              <em>${escapeHtml(check.detail)}</em>
            </div>
          </div>
          <div class="qa-check-fix">
            <span>${escapeHtml(check.severity)} severity</span>
            <p>${escapeHtml(check.recommendedFix || "No action needed.")}</p>
          </div>
          ${renderQaSourceDetails(check.sourceDetails)}
        </article>
      `).join("")}
    </div>
  `;
}

function createQaSectionCopy(section) {
  return [
    section.label,
    section.summary,
    `Status: ${section.status}`,
    `Checks: ${section.passingChecks} pass / ${section.warningChecks} warn / ${section.failingChecks} fail`,
    "",
    ...section.checks.map(check => [
      `${qaStatusLabel(check.status)} - ${check.label}`,
      check.summary,
      check.detail,
      `Recommended fix: ${check.recommendedFix || "No action needed."}`
    ].join("\n"))
  ].join("\n\n");
}

function renderQaSection(section, options = {}) {
  return `
    <section class="qa-section">
      <div class="section-title compact">
        <div>
          <h2>${escapeHtml(section.label)}</h2>
          <p>${escapeHtml(section.summary)}</p>
        </div>
        <div class="qa-actions">
          ${renderQaStatusBadge(section.status)}
          ${options.copyLabel ? renderCopyButton(createQaSectionCopy(section), options.copyLabel) : ""}
          ${options.actions || ""}
        </div>
      </div>
      ${options.before || ""}
      ${renderQaCheckRows(section.checks)}
      ${options.after || ""}
    </section>
  `;
}

function renderDemoHealthCard(report) {
  const copyText = getDemoControl().createQAReportCopy(report);
  return `
    <section class="demo-health-card ${qaTone(report.overallStatus === "Ready for Demo" ? "pass" : report.overallStatus === "Needs Attention" ? "warn" : "fail")}">
      <div>
        <p class="eyebrow">Demo Health</p>
        <h2>${escapeHtml(report.overallStatus)}</h2>
        <p>${escapeHtml(report.recommendedNextAction)}</p>
      </div>
      <div class="qa-health-metrics">
        <article><span>Passing</span><strong>${report.passingChecks}</strong></article>
        <article><span>Warnings</span><strong>${report.warningChecks}</strong></article>
        <article><span>Failing</span><strong>${report.failingChecks}</strong></article>
        <article><span>Checked</span><strong>${escapeHtml(report.generatedAt)}</strong></article>
      </div>
      <div class="qa-actions">
        ${renderCopyButton(copyText, "Copy QA Report", "primary-button")}
        ${state.demoControlResetConfirm
          ? `<button class="ghost-button danger" type="button" data-demo-full-reset-confirm>Confirm Full Demo Reset</button><button class="ghost-button" type="button" data-demo-full-reset-cancel>Cancel</button>`
          : `<button class="ghost-button danger" type="button" data-demo-full-reset-arm>Reset Demo State</button>`}
      </div>
    </section>
  `;
}

function renderWalkthroughTargetAudit(section) {
  const rows = section.checks.map(check => {
    const source = check.sourceDetails || {};
    return `
      <article class="walkthrough-audit-row ${qaTone(check.status)}">
        <span>${source.stepNumber || ""}</span>
        <strong>${escapeHtml(check.label.replace(/^Step \d+:\s*/, ""))}</strong>
        <code>${escapeHtml(source.target || "Missing target")}</code>
        ${renderQaStatusBadge(check.status, source.currentlyFound ? "Found" : source.registered ? "Expected After Nav" : qaStatusLabel(check.status))}
        <p>${escapeHtml(check.recommendedFix)}</p>
      </article>
    `;
  }).join("");
  return `
    <section class="qa-section">
      <div class="section-title compact">
        <div>
          <h2>Walkthrough Target Audit</h2>
          <p>Confirms the 5-minute buyer walkthrough can find each target in the local UI.</p>
        </div>
        <div class="qa-actions">
          ${renderQaStatusBadge(section.status)}
          ${renderCopyButton(createQaSectionCopy(section), "Copy Walkthrough Audit")}
        </div>
      </div>
      <div class="walkthrough-audit-table">
        ${rows}
      </div>
    </section>
  `;
}

function renderCopyMaterialAudit(section, copyMaterials) {
  const snapshot = getDemoControl().createCopyMaterialsSnapshot(copyMaterials, "CMTCommand Demo Materials Snapshot");
  return renderQaSection(section, {
    copyLabel: "Copy Copy Audit",
    actions: renderCopyButton(snapshot, "Copy All Demo Materials Snapshot", "primary-button")
  });
}

function renderOperationalImpactQa(section) {
  const metrics = section.metrics || {};
  const metricRows = Object.entries(metrics).map(([key, value]) => `
    <article>
      <span>${escapeHtml(key.replace(/([A-Z])/g, " $1").trim())}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join("");
  return renderQaSection(section, {
    copyLabel: "Copy Impact QA",
    before: `<div class="qa-metric-grid">${metricRows}</div>`,
    after: renderImpactSourceDetails(section.snapshot?.sourceDetails || {}, "How this was calculated")
  });
}

function renderPilotMaterialsQa(section) {
  return renderQaSection(section, {
    copyLabel: "Copy Pilot Materials QA",
    actions: `<button class="primary-button" type="button" data-page="pilotpack">Open Pilot Materials</button>`
  });
}

function renderLocalDemoStateInspector(section) {
  const summary = section.stateSummary || {};
  const storageKeys = summary.relevantStorageKeys || [];
  const rows = [
    ["Selected page", summary.selectedPage],
    ["UI mode", summary.uiMode],
    ["Theme", summary.theme],
    ["Walkthrough active", summary.walkthroughActive ? "Yes" : "No"],
    ["Walkthrough completed", summary.walkthroughCompleted ? "Yes" : "No"],
    ["Walkthrough skipped", summary.walkthroughSkipped ? "Yes" : "No"],
    ["TRD-104 approval state", summary.trd104ApprovalState],
    ["Decision Log entries", summary.decisionLogEntryCount],
    ["Scorecard checked", summary.scorecardCheckedCount],
    ["CMTCommand storage keys", storageKeys.length ? storageKeys.join(", ") : "None"]
  ];
  const inspector = `
    <div class="state-inspector">
      ${rows.map(([label, value]) => `
        <article>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value ?? "Unknown"))}</strong>
        </article>
      `).join("")}
    </div>
    <div class="qa-actions state-reset-actions">
      <button class="ghost-button" type="button" data-demo-reset-walkthrough-state>Reset Walkthrough State</button>
      <button class="ghost-button" type="button" data-demo-reset-story-state>Reset Demo Story State</button>
      <button class="ghost-button" type="button" data-reset-scorecard>Reset Scorecard</button>
      ${state.demoControlResetConfirm
        ? `<button class="ghost-button danger" type="button" data-demo-full-reset-confirm>Confirm Full Demo Reset</button><button class="ghost-button" type="button" data-demo-full-reset-cancel>Cancel</button>`
        : `<button class="ghost-button danger" type="button" data-demo-full-reset-arm>Full Demo Reset</button>`}
    </div>
  `;
  return renderQaSection(section, {
    copyLabel: "Copy Local State QA",
    before: inspector
  });
}

function createPreDemoChecklistCopy() {
  const checklist = getDemoControl().createPreDemoChecklist();
  return [
    "CMTCommand Pre-Demo Checklist",
    "",
    ...checklist.map(item => `${state.preDemoChecklist[item.id] ? "[x]" : "[ ]"} ${item.label}`)
  ].join("\n");
}

function renderPreDemoChecklist() {
  const checklist = getDemoControl().createPreDemoChecklist();
  return `
    <section class="qa-section pre-demo-checklist">
      <div class="section-title compact">
        <div>
          <h2>Pre-Demo Checklist</h2>
          <p>Pre-flight checks before showing the local demo to a manager, owner, PM, dispatcher, or operations lead.</p>
        </div>
        <div class="qa-actions">
          ${renderCopyButton(createPreDemoChecklistCopy(), "Copy Pre-Demo Checklist", "primary-button")}
          <button class="ghost-button" type="button" data-reset-pre-demo-checklist>Reset Checklist</button>
        </div>
      </div>
      <div class="pre-demo-checklist-list">
        ${checklist.map(item => `
          <label class="scorecard-item">
            <input type="checkbox" data-pre-demo-check="${item.id}" ${state.preDemoChecklist[item.id] ? "checked" : ""}>
            <span>${escapeHtml(item.label)}</span>
          </label>
        `).join("")}
      </div>
    </section>
  `;
}

function renderUiPolishChecklist() {
  const checks = [
    ["Tomorrow Readiness readable at a glance", "Ready, At Risk, Not Ready, and next action are visible without scrolling."],
    ["TRD-104 stands out", "Highest-risk work order uses stronger risk styling and a clear Find Coverage action."],
    ["Primary action is obvious", "Find Coverage, Approve Coverage Plan, and Run Demo QA are visually prioritized."],
    ["Source details stay secondary", "Source Fields are available through details panels without dominating the page."],
    ["Walkthrough target highlight is visible", "Pilot Story Mode highlight can be seen in standard, dark, and command modes."],
    ["No generic dashboard wording on main pages", "Labels favor coverage, certification, equipment, dispatch, source fields, and decision records."],
    ["Mobile has no horizontal overflow", "390px layout stacks cards and wraps action rows cleanly."]
  ];
  return `
    <section class="qa-section ui-polish-checklist">
      <div class="section-title compact">
        <div>
          <h2>UI Credibility Checklist</h2>
          <p>Static checklist for keeping the demo operational, specific, and free of generic dashboard cues.</p>
        </div>
        ${renderQaStatusBadge("pass", "Review")}
      </div>
      <div class="ui-polish-list">
        ${checks.map(([label, detail]) => `
          <article>
            ${renderQaStatusBadge("pass", "Check")}
            <div>
              <strong>${escapeHtml(label)}</strong>
              <p>${escapeHtml(detail)}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderKnownLimitations() {
  const limitations = getDemoControl().createKnownLimitations();
  const copyText = ["CMTCommand Demo Known Limitations", "", ...limitations.map(item => `- ${item}`)].join("\n");
  return `
    <section class="qa-section known-limitations">
      <div class="section-title compact">
        <div>
          <h2>Known Limitations</h2>
          <p>Use this to avoid overclaiming during founder-led demos.</p>
        </div>
        ${renderCopyButton(copyText, "Copy Known Limitations", "primary-button")}
      </div>
      <div class="known-limitations-list">
        ${limitations.map(item => `<article>${renderQaStatusBadge("warn", "Limit")}<strong>${escapeHtml(item)}</strong></article>`).join("")}
      </div>
    </section>
  `;
}

function renderDemoControlCenter() {
  const context = getDemoControlContext();
  const report = getDemoControl().createDemoHealthReport(context);
  const sections = report.sections.reduce((acc, section) => {
    acc[section.id] = section;
    return acc;
  }, {});
  return `
    <section class="demo-control">
      <section class="panel demo-control-hero">
        <div>
          <p class="eyebrow">Founder QA Center</p>
          <h2>Demo Control Center</h2>
          <p>Pre-flight checklist for the local CMTCommand demo before showing it to a manager, owner, PM, dispatcher, or operations lead.</p>
        </div>
        <div class="qa-actions">
          <button class="primary-button" type="button" data-start-walkthrough>Start Demo Walkthrough</button>
          <button class="ghost-button" type="button" data-page="command">Open Tomorrow Readiness</button>
          <button class="ghost-button" type="button" data-page="pilotpack">Open Pilot Materials</button>
        </div>
      </section>
      ${renderDemoHealthCard(report)}
      ${renderQaSection(sections["required-utilities"], { copyLabel: "Copy Utility QA" })}
      <div class="qa-grid">
        ${renderQaSection(sections["trd-104-story"], { copyLabel: "Copy TRD-104 Status" })}
        ${renderWalkthroughTargetAudit(sections["walkthrough-target-audit"])}
      </div>
      ${renderCopyMaterialAudit(sections["copy-material-audit"], context.copyMaterials)}
      ${renderOperationalImpactQa(sections["operational-impact-qa"])}
      ${renderPilotMaterialsQa(sections["pilot-materials-qa"])}
      ${renderLocalDemoStateInspector(sections["local-demo-state"])}
      ${renderPreDemoChecklist()}
      ${renderUiPolishChecklist()}
      ${renderKnownLimitations()}
      <section class="qa-section qa-report-export">
        <div>
          <h2>QA Report Export</h2>
          <p>Plain-text pre-demo report for founder notes.</p>
        </div>
        <div class="qa-actions">
          ${renderCopyButton(getDemoControl().createQAReportCopy(report), "Copy QA Report", "primary-button")}
        </div>
      </section>
    </section>
  `;
}

function getDemoWalkthrough() {
  return window.CMTDemoWalkthrough;
}

function getWalkthroughPersistedState() {
  return {
    isWalkthroughActive: state.isWalkthroughActive,
    currentWalkthroughStepId: state.currentWalkthroughStepId,
    completedWalkthroughStepIds: state.completedWalkthroughStepIds,
    walkthroughStartedAt: state.walkthroughStartedAt,
    walkthroughCompletedAt: state.walkthroughCompletedAt,
    walkthroughMode: state.walkthroughMode,
    walkthroughWasSkipped: state.walkthroughWasSkipped,
    walkthroughActionsTaken: state.walkthroughActionsTaken
  };
}

function persistWalkthroughState() {
  getDemoShared().safeWriteJsonLocalStorage("cmtcommand-demo-walkthrough", getWalkthroughPersistedState());
}

function persistPreDemoChecklistState() {
  getDemoShared().safeWriteJsonLocalStorage("cmtcommand-demo-control-checklist", state.preDemoChecklist);
}

function applyWalkthroughState(nextState) {
  Object.assign(state, nextState);
  persistWalkthroughState();
}

function getDemoRecapText() {
  return getDemoWalkthrough().createDemoRecap({
    approvedMariaLopez: Boolean(state.demoDecision?.technician === "Maria Lopez" || state.emergencyDecisionLog.some(entry => entry.assignedTechnician === "Maria Lopez" && /TRD-104/.test(entry.emergencyWorkOrder || ""))),
    impactSnapshot: createOperationalImpactSnapshot()
  });
}

function makePilotStoryImportRows() {
  return [
    {
      work_order: "TRD-104",
      project: "Potomac Crossing Garage",
      service_type: "Concrete Pour",
      required_certifications: "ACI Concrete Field Testing Technician Grade I",
      required_equipment: "Slump cone kit; Air meter; Thermometer; Cylinder molds",
      priority: "Urgent",
      status: "Scheduled",
      requested_start: "2026-06-12 07:30"
    },
    {
      work_order: "TRD-105",
      project: "Capital Metro Station",
      service_type: "",
      required_certifications: "ICC Structural Steel",
      required_equipment: "Steel inspection kit",
      priority: "High",
      status: "Scheduled",
      requested_start: "2026-06-12 10:00"
    },
    {
      work_order: "TRD-106",
      project: "Dulles Data Hall",
      service_type: "Soil Density",
      required_certifications: "",
      required_equipment: "Troxler gauge",
      priority: "Normal",
      status: "Scheduled",
      requested_start: "2026-06-12 13:00"
    }
  ];
}

function ensurePilotStoryImportPreview() {
  if (state.intakeImport?.source === "Pilot Story sample") return;
  const rows = makePilotStoryImportRows();
  state.intakeImport = {
    entity: "workorders",
    rows,
    source: "Pilot Story sample",
    validation: validateImport("workorders", rows)
  };
}

function markWalkthroughAction(key) {
  state.walkthroughActionsTaken = {
    ...state.walkthroughActionsTaken,
    [key]: true
  };
}

function prepareWalkthroughStep(stepId) {
  const step = getDemoWalkthrough().getStep(stepId);
  if (["scheduled-not-ready", "risk-summarized", "trd-104-highest-risk"].includes(step.id)) {
    markWalkthroughAction("viewedTomorrowReadiness");
    state.selectedDemoWorkOrder = "TRD-104";
    state.demoCoverageOpen = false;
  }
  if (step.id === "readiness-packet") {
    markWalkthroughAction("viewedTRD104Packet");
    state.selectedDemoWorkOrder = "TRD-104";
    state.demoCoverageOpen = false;
    state.selectedDemoTech = "";
  }
  if (["find-coverage", "coverage-handoff", "approve-coverage"].includes(step.id)) {
    markWalkthroughAction("viewedCoverageRecommendation");
    state.selectedDemoWorkOrder = "TRD-104";
    state.demoCoverageOpen = true;
    state.selectedDemoTech = "DT-08";
    state.demoScriptStep = Math.max(state.demoScriptStep, 4);
    if (!state.demoDecisionNote && ["coverage-handoff", "approve-coverage"].includes(step.id)) {
      state.demoDecisionNote = "Assign Maria Lopez for the 7:30 AM pour. Use SC-18, AM-09, TH-03, and CM-44 from the Springfield field cage before dispatch.";
    }
  }
  if (step.id === "decision-log") {
    markWalkthroughAction("viewedDecisionLog");
    if (!state.demoDecision) assignDemoCoverage("DT-08", false);
  }
  if (step.id === "operational-impact" || step.id === "final-pilot-takeaway") {
    markWalkthroughAction("viewedOperationalImpact");
  }
  if (step.id === "pilot-data-readiness") {
    markWalkthroughAction("viewedPilotSetup");
    ensurePilotStoryImportPreview();
  }
  state.activePage = step.page;
}

function startDemoWalkthrough({ resetStory = true } = {}) {
  if (resetStory) {
    resetDemoWorkflow();
    state.emergencyDecisionLog = state.emergencyDecisionLog.filter(entry => !/TRD-104/.test(entry.emergencyWorkOrder || ""));
  }
  const startedAt = getDemoTimestamp();
  const initial = getDemoWalkthrough().createInitialState(startedAt);
  applyWalkthroughState({
    ...initial,
    isWalkthroughActive: true,
    walkthroughStartedAt: startedAt,
    currentWalkthroughStepId: "scheduled-not-ready",
    walkthroughWasSkipped: false
  });
  prepareWalkthroughStep("scheduled-not-ready");
  persistWalkthroughState();
  setPage("command");
}

function restartDemoWalkthrough() {
  startDemoWalkthrough({ resetStory: true });
}

function skipDemoWalkthrough() {
  applyWalkthroughState({
    isWalkthroughActive: false,
    walkthroughWasSkipped: true,
    walkthroughCompletedAt: getDemoTimestamp()
  });
  render();
}

function closeDemoWalkthrough() {
  applyWalkthroughState({
    isWalkthroughActive: false,
    walkthroughCompletedAt: getDemoTimestamp()
  });
  render();
}

function goToWalkthroughStep(stepId) {
  const step = getDemoWalkthrough().getStep(stepId);
  applyWalkthroughState({
    currentWalkthroughStepId: step.id,
    isWalkthroughActive: true
  });
  prepareWalkthroughStep(step.id);
  persistWalkthroughState();
  setPage(step.page);
}

function advanceWalkthroughStep() {
  const current = state.currentWalkthroughStepId;
  const completed = new Set(state.completedWalkthroughStepIds || []);
  completed.add(current);
  if (current === "approve-coverage" && !state.demoDecision) {
    assignDemoCoverage("DT-08", false);
    markWalkthroughAction("approvedMariaLopez");
  }
  if (current === "final-pilot-takeaway") {
    applyWalkthroughState({
      completedWalkthroughStepIds: [...completed],
      isWalkthroughActive: false,
      walkthroughCompletedAt: getDemoTimestamp()
    });
    render();
    return;
  }
  applyWalkthroughState({
    completedWalkthroughStepIds: [...completed],
    currentWalkthroughStepId: getDemoWalkthrough().getNextStepId(current)
  });
  goToWalkthroughStep(state.currentWalkthroughStepId);
}

function previousWalkthroughStep() {
  const previous = getDemoWalkthrough().getPreviousStepId(state.currentWalkthroughStepId);
  goToWalkthroughStep(previous);
}

function renderWalkthroughLaunchStrip() {
  return `
    <section class="panel demo-walkthrough-launch" data-demo-target="demo-walkthrough-launch">
      <div>
        <p class="eyebrow">Pilot Story Mode</p>
        <h2>Start Demo Walkthrough</h2>
        <p>Follow the 3-5 minute story: scheduled work, readiness risk, coverage decision, and operational impact.</p>
      </div>
      <div class="panel-actions">
        <button class="primary-button" type="button" data-start-walkthrough>Start Demo Walkthrough</button>
        <button class="ghost-button" type="button" data-restart-walkthrough>Restart Demo Walkthrough</button>
      </div>
    </section>
  `;
}

function renderWalkthroughOverlay() {
  if (!state.isWalkthroughActive) return "";
  const step = getDemoWalkthrough().getStep(state.currentWalkthroughStepId);
  const progress = getDemoWalkthrough().getProgress(step.id);
  const isFinal = step.id === "final-pilot-takeaway";
  const recapText = getDemoRecapText();
  const secondaryLabel = isFinal ? "Restart" : "Next";
  return `
    <aside class="demo-walkthrough-overlay" role="dialog" aria-live="polite" aria-label="Pilot Story Mode">
      <div class="demo-walkthrough-card ${isFinal ? "demo-walkthrough-recap" : ""}" data-demo-target="${isFinal ? "demo-final-recap" : "walkthrough-card"}">
        <div class="demo-walkthrough-progress">
          <span>${progress.label}</span>
          <strong>Pilot Story Mode</strong>
          <div><i style="width:${progress.percent}%"></i></div>
        </div>
        <div class="demo-walkthrough-copy">
          <span class="badge info">5-Min Demo Path</span>
          <h2>${escapeHtml(step.title)}</h2>
          ${isFinal ? `
            <p>${escapeHtml("CMTCommand reviewed tomorrow's schedule, identified TRD-104 as the highest-risk job, explained the coverage gap, recommended Maria Lopez, recorded the decision, and updated the impact snapshot.")}</p>
            <div class="demo-recap-metrics">
              ${renderDemoRecapMetrics()}
            </div>
          ` : `
            <dl>
              <div><dt>Current view</dt><dd>${escapeHtml(step.seeing)}</dd></div>
              <div><dt>Operational reason</dt><dd>${escapeHtml(step.why)}</dd></div>
              <div><dt>Buyer takeaway</dt><dd>${escapeHtml(step.takeaway)}</dd></div>
            </dl>
          `}
        </div>
        <div class="demo-walkthrough-actions">
          ${progress.current > 1 && !isFinal ? `<button class="ghost-button" type="button" data-walkthrough-back>Back</button>` : ""}
          ${isFinal ? renderCopyButton(recapText, "Copy Demo Recap", "primary-button") : `<button class="primary-button" type="button" data-walkthrough-next>${escapeHtml(step.primaryLabel || secondaryLabel)}</button>`}
          ${isFinal ? `<button class="ghost-button" type="button" data-restart-walkthrough>Restart Walkthrough</button><button class="ghost-button" type="button" data-walkthrough-close>Close</button>` : `<button class="ghost-button" type="button" data-walkthrough-skip>Skip</button>`}
        </div>
      </div>
    </aside>
  `;
}

function renderDemoRecapMetrics() {
  const snapshot = createOperationalImpactSnapshot();
  const latestDecision = state.emergencyDecisionLog.find(entry => /TRD-104/.test(entry.emergencyWorkOrder || ""));
  const topPattern = snapshot.repeatFailurePatterns[0];
  const cleanup = snapshot.dataQualityScore.recommendedCleanupActions[0] || "Pilot data is ready for this local demo.";
  const metrics = [
    ["Issues caught before tomorrow", snapshot.issuesCaughtBeforeTomorrow],
    ["Highest-risk job", snapshot.highestRiskWorkOrder.id],
    ["Decision made", latestDecision ? `${latestDecision.assignedTechnician} approved` : "Maria Lopez recommended"],
    ["Estimated review time saved", `${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow}-${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesHigh} min`],
    ["Top repeat failure pattern", topPattern?.title || "Coverage and certification constraints"],
    ["Recommended manager action", snapshot.recommendedManagerActions[0] || "Review readiness blockers before dispatch."],
    ["Data cleanup takeaway", cleanup]
  ];
  return metrics.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join("");
}

function applyWalkthroughAfterRender() {
  document.body.classList.toggle("walkthrough-active", Boolean(state.isWalkthroughActive));
  document.querySelectorAll(".demo-highlight").forEach(item => item.classList.remove("demo-highlight"));
  if (!state.isWalkthroughActive) return;
  const step = getDemoWalkthrough().getStep(state.currentWalkthroughStepId);
  window.setTimeout(() => {
    const target = document.querySelector(`[data-demo-target="${step.target}"]`) || document.querySelector(".demo-walkthrough-card");
    if (target) {
      target.classList.add("demo-highlight");
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
    const focusTarget = document.querySelector(".demo-walkthrough-card .primary-button, .demo-walkthrough-card button");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }, 80);
}

function enrichDecisionEntry(entry) {
  return {
    ...entry,
    decisionSummary: getOpsCompression().createDecisionSummary(entry, getOpsContext({
      generatedAt: entry.timestamp
    }))
  };
}

function renderTomorrowOpsBrief(summary) {
  return `
    <section class="panel ops-brief-card ${summary.tone}" data-demo-target="tomorrow-ops-brief">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Tomorrow Ops Brief</p>
          <h2>${summary.headline}</h2>
          <p>${escapeHtml(summary.summary)}</p>
        </div>
        <div class="panel-actions">
          <span class="badge ${summary.tone}">${summary.status}</span>
          ${renderOpsViewToggle()}
          <button class="ghost-button" type="button" data-start-walkthrough>Start Demo Walkthrough</button>
          ${renderCopyButton(summary.copyText, "Copy PM Handoff", "primary-button")}
        </div>
      </div>
      <div class="ops-brief-grid">
        ${summary.keyFacts.slice(0, 4).map((fact, index) => `<article><span>${["Tomorrow Dispatch", "Inspection Readiness", "Coverage Gap", "Manager Action"][index] || "Source Fact"}</span><strong>${escapeHtml(fact)}</strong></article>`).join("")}
      </div>
      <div class="ops-summary-columns">
        ${renderSummaryList("Top Blockers", summary.blockers.slice(0, 4), "No readiness blockers")}
        ${renderSummaryList("Source Field Gaps", summary.missingData.slice(0, 4), "No missing source fields")}
        ${renderSummaryList("Recommended Action", [summary.recommendedNextAction])}
      </div>
      ${renderSourceDetails(summary)}
    </section>
  `;
}

function renderReadinessPacket(summary) {
  const targetAttr = summary.headline.includes("TRD-104") ? ` data-demo-target="trd-104-readiness-packet"` : "";
  return `
    <article class="ops-packet-card ${summary.tone}"${targetAttr}>
      <div class="ops-card-head">
        <div>
          <p class="eyebrow">Readiness Packet</p>
          <h3>${summary.headline}</h3>
          <p>${escapeHtml(summary.summary)}</p>
        </div>
        <div class="panel-actions">
          <span class="badge ${summary.tone}">${summary.status}</span>
          ${renderCopyButton(summary.copyText, "Copy PM Handoff")}
        </div>
      </div>
      <div class="ops-brief-grid compact">
        ${summary.keyFacts.map((fact, index) => `<article><span>${["Work Order Signal", "Certification Match", "Equipment Required", "Assigned Tech"][index] || "Source Field"}</span><strong>${escapeHtml(fact)}</strong></article>`).join("")}
      </div>
      <div class="ops-summary-columns">
        ${renderSummaryList("Current Blockers", summary.blockers, "No blockers")}
        ${renderSummaryList("Source Field Gaps", summary.missingData, "No missing source fields")}
        ${renderSummaryList("Recommended Action", [summary.recommendedNextAction])}
      </div>
      ${renderSourceDetails(summary)}
    </article>
  `;
}

function renderCoverageHandoffPacket(summary) {
  const targetAttr = summary.summary.includes("Maria Lopez") ? ` data-demo-target="maria-coverage-handoff"` : "";
  return `
    <article class="ops-packet-card info coverage-handoff-card"${targetAttr}>
      <div class="ops-card-head">
        <div>
          <p class="eyebrow">Coverage Handoff Packet</p>
          <h3>${escapeHtml(summary.headline)}</h3>
          <p>${escapeHtml(summary.summary)}</p>
        </div>
        <div class="panel-actions">
          <span class="badge ${summary.tone}">${escapeHtml(summary.status)}</span>
          ${renderCopyButton(summary.copyText, "Copy Coverage Handoff")}
        </div>
      </div>
      <div class="ops-summary-columns">
        ${renderSummaryList("Why This Tech", summary.keyFacts.slice(0, 5))}
        ${renderSummaryList("Remaining Risks", summary.blockers.length ? summary.blockers : summary.sourceFields["Remaining risks"], "No remaining risks")}
        ${renderSummaryList("Approval Action", [summary.recommendedNextAction])}
      </div>
      ${renderSourceDetails(summary)}
    </article>
  `;
}

function renderSmartIntakeSummary(summary) {
  return `
    <section class="ops-packet-card intake-summary-card ${summary.tone}" data-demo-target="smart-intake-summary">
      <div class="ops-card-head">
        <div>
          <p class="eyebrow">Pilot Data Quality</p>
          <h3>${summary.headline}</h3>
          <p>${escapeHtml(summary.summary)}</p>
        </div>
        <div class="panel-actions">
          <span class="badge ${summary.tone}">${summary.status}</span>
          ${renderCopyButton(summary.cleanupRequestText || summary.copyText, summary.copyButtonLabel || "Copy Cleanup Request", "primary-button")}
        </div>
      </div>
      <div class="ops-brief-grid compact">
        ${summary.keyFacts.map(fact => `<article><span>Source Field</span><strong>${escapeHtml(fact)}</strong></article>`).join("")}
      </div>
      <div class="ops-summary-columns">
        ${renderSummaryList("Cleanup Actions", [summary.recommendedNextAction, ...summary.missingData.slice(0, 3)])}
        ${renderSummaryList("Duplicate / Missing Risk", summary.blockers.length ? summary.blockers : summary.missingData, "No required-field gaps")}
      </div>
      ${renderSourceDetails(summary)}
    </section>
  `;
}

function getCoverageImpactForTech(tech, targetOrder) {
  return getReadinessEngine().getCoverageImpactForTechnician(tech, targetOrder, getReadinessEngineContext());
}

function getDemoCoverageCandidates(order) {
  return getReadinessEngine().createCoverageCandidates(order, getReadinessEngineContext());
}

function getSelectedDemoCandidate(order) {
  const candidates = getDemoCoverageCandidates(order);
  return candidates.find(candidate => candidate.tech.id === state.selectedDemoTech)
    || candidates.find(candidate => candidate.canAssign)
    || candidates[0];
}

function getDemoScriptSteps() {
  return [
    {
      title: "Show tomorrow's scheduled work",
      prompt: "Start with the schedule and status cards. The customer should see tomorrow's work classified before crews are moving.",
      target: "schedule"
    },
    {
      title: "Highlight a Not Ready job",
      prompt: "Use TRD-104, the 7:30 AM concrete pour. It is Not Ready because the assigned technician is unavailable.",
      target: "not-ready"
    },
    {
      title: "Explain the readiness issue",
      prompt: "Point to the issue reasons: required certifications, equipment, calibration, and technician availability are checked before dispatch.",
      target: "issues"
    },
    {
      title: "Prompt user to click Find Coverage",
      prompt: "Ask the prospect what they would do today, then click Find Coverage to compare the CMTCommand workflow.",
      target: "find"
    },
    {
      title: "Show qualified replacement technicians",
      prompt: "Review same-office and other-office matches, including requirements, warnings, and hard blockers.",
      target: "coverage"
    },
    {
      title: "Prompt user to add a decision note",
      prompt: "Document why this coverage decision was made so it is not lost in texts, calls, or memory.",
      target: "note"
    },
    {
      title: "Reassign technician",
      prompt: "Reassign the selected qualified technician and watch the readiness logic recalculate locally.",
      target: "assign"
    },
    {
      title: "Show dashboard status changing",
      prompt: "TRD-104 moves from Not Ready to Ready and the dashboard counts update, proving the value of tomorrow readiness.",
      target: "outcome"
    }
  ];
}

function resetDemoWorkflow() {
  state.selectedDemoWorkOrder = "TRD-104";
  state.demoCoverageOpen = false;
  state.selectedDemoTech = "";
  state.demoDecisionNote = "";
  state.demoAssignments = {};
  state.demoDecision = null;
  state.demoScriptStep = 0;
  state.selectedCylinderPickup = "CP-501";
  state.pickupSuggestionsOpen = false;
  state.selectedPickupTech = "";
  state.pickupAssignments = {};
}

function resetWalkthroughStateOnly() {
  applyWalkthroughState(getDemoWalkthrough().resetWalkthroughState(getDemoTimestamp()));
  state.demoControlResetConfirm = false;
  render();
}

function resetDemoStoryState() {
  resetDemoWorkflow();
  state.emergencyDecisionLog = state.emergencyDecisionLog.filter(entry => !/TRD-104/.test(entry.emergencyWorkOrder || ""));
  if (state.intakeImport?.source === "Pilot Story sample") state.intakeImport = null;
  state.demoControlResetConfirm = false;
  render();
}

function resetPreDemoChecklist() {
  state.preDemoChecklist = {};
  persistPreDemoChecklistState();
  state.demoControlResetConfirm = false;
  render();
}

function runFullDemoReset() {
  getDemoControl().createDemoResetPlan().storageKeys.forEach(key => getDemoShared().safeRemoveLocalStorage(key));
  resetDemoWorkflow();
  state.emergencyDecisionLog = state.emergencyDecisionLog.filter(entry => !/TRD-104/.test(entry.emergencyWorkOrder || ""));
  if (state.intakeImport?.source === "Pilot Story sample") state.intakeImport = null;
  state.pilotScorecard = {};
  state.preDemoChecklist = {};
  Object.assign(state, getDemoWalkthrough().resetWalkthroughState(getDemoTimestamp()));
  persistWalkthroughState();
  state.demoControlResetConfirm = false;
  render();
}

function advanceDemoScript(delta) {
  const max = getDemoScriptSteps().length - 1;
  const next = Math.max(0, Math.min(max, state.demoScriptStep + delta));
  state.demoScriptStep = next;
  if (next >= 1) state.selectedDemoWorkOrder = "TRD-104";
  if (next >= 4) {
    const order = getDemoWorkOrder(state.selectedDemoWorkOrder);
    state.demoCoverageOpen = true;
    state.selectedDemoTech = getSelectedDemoCandidate(order)?.tech.id || "";
  }
  if (next >= 5 && !state.demoDecisionNote) {
    state.demoDecisionNote = "Assign Maria Lopez for the 7:30 AM pour. Use SC-18, AM-09, TH-03, and CM-44 from the Springfield field cage before dispatch.";
  }
  if (next >= 7 && !state.demoDecision) {
    assignDemoCoverage(state.selectedDemoTech || "DT-02", false);
  }
  render();
}

function renderNav() {
  const allowed = roleAccess[state.role];
  const nav = document.getElementById("navList");
  nav.innerHTML = pages
    .filter(([id]) => allowed.includes(id))
    .map(([id, label, icon]) => `
      <button class="nav-button ${state.activePage === id ? "active" : ""}" type="button" data-page="${id}">
        <span class="nav-icon">${icon}</span><span>${label}</span>
      </button>
    `).join("");
}

function applyTheme() {
  const isDark = state.theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  document.body.classList.toggle("theme-light", !isDark);
  const button = document.getElementById("themeToggle");
  if (button) {
    button.textContent = isDark ? "Light" : "Dark";
    button.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    button.setAttribute("aria-pressed", String(isDark));
  }
}

function applyUiMode() {
  const isCommand = state.uiMode === "command";
  document.documentElement.dataset.uiMode = state.uiMode;
  document.body.classList.toggle("command-mode", isCommand);
  document.body.classList.toggle("standard-mode", !isCommand);
  const select = document.getElementById("uiModeSelect");
  if (select) select.value = state.uiMode;
}

function setUiMode(mode) {
  state.uiMode = mode === "command" ? "command" : "standard";
  getDemoShared().safeWriteLocalStorage("cmtcommand-ui-mode", state.uiMode);
  applyUiMode();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  getDemoShared().safeWriteLocalStorage("cmtcommand-theme", state.theme);
  applyTheme();
}

function setPage(id) {
  const allowed = roleAccess[state.role];
  state.activePage = allowed.includes(id) ? id : allowed[0];
  document.getElementById("pageTitle").textContent = pageLabels[state.activePage] || "CMTCommand";
  document.getElementById("roleEyebrow").textContent = `${state.role} view`;
  renderNav();
  render();
}

function render() {
  const view = {
    command: renderCommandCenter,
    demo: renderReadinessDemo,
    dispatch: renderDispatch,
    projects: renderProjects,
    workorders: renderWorkOrders,
    technicians: renderTechnicians,
    workforce: renderWorkforceQualifications,
    certifications: renderCertifications,
    equipment: renderEquipment,
    laboratory: renderLaboratory,
    geotechnical: renderGeotechnical,
    reports: renderReports,
    billing: renderBilling,
    dataintake: renderDataIntake,
    decisionlog: renderDecisionLogPage,
    pilotpack: renderPilotReadinessPack,
    demoqa: renderDemoControlCenter,
    settings: renderSettings
  }[state.activePage];
  document.getElementById("app").innerHTML = `${view()}${renderWalkthroughOverlay()}`;
  hydrateSafeTextSinks();
  wirePageControls();
  applyWalkthroughAfterRender();
}

function renderCommandCenter() {
  const readiness = getTomorrowReadinessData();
  const issues = getCriticalReadinessIssues();
  const actions = getReadinessActionQueue();
  const orderedJobs = filterAndSortReadinessJobs(readiness.jobs, "tomorrowReadiness");
  const primaryIssue = issues[0] || null;
  const primaryGapLabel = primaryIssue ? `${primaryIssue.order.id} ${primaryIssue.label}` : "No Open Readiness Gap";
  const primaryActionLabel = actions[0]?.title || "Dispatch as planned";
  const latestDecision = state.emergencyDecisionLog[0];
  const opsBrief = createTomorrowOpsBriefSummary(readiness, issues, actions);
  const impactSnapshot = createOperationalImpactSnapshot();
  const signals = [
    ["Schedule Checked", "6 work orders reviewed for tomorrow"],
    ["People Checked", "Availability and assignment status reviewed"],
    ["Certs Checked", "Required ACI, WACEL, ICC, and nuclear gauge safety rules checked"],
    ["Equipment Checked", "Gauge, air meter, slump kit, thermometer, and molds reviewed"],
    ["Clearance Checked", "Site orientation and access requirements reviewed"],
    ["Pickup Risk Checked", "Cylinder pickup obligations included"],
    ["Cascading Impact Checked", "Coverage moves checked for new gaps"]
  ];
  const criticalBody = `
    <div class="readiness-issue-list">
      ${issues.length ? issues.slice(0, 5).map(issue => `
        <article class="readiness-issue-card ${issue.tone}">
          <div class="gap-card-head">
            <span class="badge ${issue.tone}">${issue.order.id} - ${issue.label.includes("Cert") ? "Certification Gap" : issue.label.includes("Assignment") ? "Coverage Gap" : issue.label}</span>
            <span class="badge ${issue.tone}">${issue.severity}</span>
          </div>
          <strong>${escapeHtml(issue.reason.replace(/\.$/, ""))}</strong>
          <div class="gap-structure">
            <div><span>Why It Matters</span><p>${issue.order.service === "Cylinder pickup" ? "Pickup obligations affect tomorrow readiness and lab handoff." : `${escapeHtml(getServiceDisplayName(issue.order.service))} cannot proceed cleanly at ${escapeHtml(issue.order.time)}.`}</p></div>
            <div><span>Recommended Fix</span><p>${escapeHtml(getReadinessActionForIssue(issue))}</p></div>
          </div>
          <div class="readiness-issue-footer">
            <span>${issue.module}</span>
            <button class="link-button" type="button" data-page="${issue.page}">Open</button>
          </div>
        </article>
      `).join("") : `<div class="empty-state">No critical readiness gaps. Tomorrow is currently ready.</div>`}
    </div>
    <div class="readiness-action-panel embedded">
      <div class="section-title">
        <div>
          <h2>Next Actions Queue</h2>
          <p>Dispatcher-ready actions to close gaps before tomorrow starts.</p>
        </div>
      </div>
      <div class="readiness-action-list">
        ${actions.length ? actions.slice(0, 6).map((action, index) => `
          <article class="readiness-action-card ${action.tone}">
            <span class="badge ${index === 0 ? "bad" : action.tone}">${index === 0 ? "Do First" : action.label}</span>
            <strong>${escapeHtml(action.title)}</strong>
            <p>${escapeHtml(action.detail)}</p>
            <button class="ghost-button" type="button" data-page="${action.page}">Review</button>
          </article>
        `).join("") : `<div class="empty-state">No action queue items. Tomorrow is currently ready.</div>`}
      </div>
    </div>
  `;
  const tableBody = `
    ${renderReadinessControls(readiness.jobs, "tomorrowReadiness")}
    <div class="data-table-wrap no-desktop-scroll">
      <table class="readiness-work-table compact">
        <thead>
          <tr>
            <th>Readiness</th>
            <th>Time</th>
            <th>Work Order</th>
            <th>Service</th>
            <th>Site</th>
            <th>Technician</th>
            <th>Readiness Gaps</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${orderedJobs.map(job => `
            <tr class="clickable-row ${job.order.id === state.selectedDemoWorkOrder ? "selected-row" : ""}" data-demo-workorder="${job.order.id}" ${job.order.id === "TRD-104" ? `data-demo-target="trd-104-work-order"` : ""}>
              <td><span class="badge ${job.readiness.tone}">${getReadinessDisplayStatus(job.readiness.status)}</span>${job.order.id === state.selectedDemoWorkOrder ? `<span class="badge info">Selected</span>` : ""}</td>
              <td class="time-cell"><strong>${job.order.time}</strong></td>
              <td><strong>${job.order.id}</strong><br><span class="subtle">${job.order.project}</span></td>
              <td>${getServiceDisplayName(job.order.service)}</td>
              <td>${job.order.location}</td>
              <td>${job.readiness.assignedTech?.name || "Unassigned"}</td>
              <td>${renderReadinessGapDetails(job)}</td>
              <td>${job.readiness.status === "Ready"
                ? `<span class="badge good">Ready</span>`
                : `<button class="link-button" type="button" data-open-coverage="${job.order.id}">Find Coverage</button>`}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  const signalsBody = `
    <div class="readiness-signal-grid">
      ${signals.map(([title, text]) => `
        <article class="readiness-signal-card">
          <span class="badge good">Checked</span>
          <strong>${title}</strong>
          <p>${text}</p>
        </article>
      `).join("")}
    </div>
  `;
  const decisionBody = `
    <div class="decision-preview-card">
      <div>
        <span class="badge info">${state.emergencyDecisionLog.length} Entries Today</span>
        <h2>${latestDecision ? "Latest Decision" : "No Decisions Recorded Yet"}</h2>
        <p>${latestDecision ? `${latestDecision.emergencyWorkOrder} - ${latestDecision.decisionType} - ${latestDecision.assignedTechnician || latestDecision.partnerFirm || "Manager Review"}` : "Approve TRD-104 coverage or use an emergency action button to create the first local decision entry."}</p>
      </div>
      <button class="primary-button" type="button" data-page="decisionlog">Open Decision Log</button>
    </div>
  `;
  const pilotBody = `
    ${renderDemoBeforeAfter()}
    <section class="pilot-cta panel immersive">
      <span class="badge info">Limited Pilot</span>
      <h2>Test With Anonymized Real Data.</h2>
      <p>Use one week of schedule data, a technician roster, certifications, and equipment list to see which jobs are Ready, At Risk, or Not Ready.</p>
      <button class="primary-button" type="button" data-page="dataintake">Open Pilot Setup</button>
    </section>
  `;

  return `
    ${renderWalkthroughLaunchStrip()}
    <section class="readiness-command-hero">
      <div class="readiness-score-card ${readiness.tone}">
        <div class="readiness-score-main">
          <div>
            <p class="eyebrow">Scheduled Does Not Mean Ready.</p>
            <h2>Tomorrow Dispatch Readiness</h2>
            <div class="readiness-score-line">
              <strong>${readiness.score}%</strong>
              <span class="badge ${readiness.tone}">${readiness.status}</span>
            </div>
          </div>
          <div class="readiness-score-ring">
            <strong>${readiness.score}%</strong>
            <span>Readiness Score</span>
          </div>
        </div>
        <div class="readiness-hero-facts">
          <span><strong>${readiness.total}</strong> Tomorrow Jobs</span>
          <span><strong>${readiness.ready}</strong> Ready</span>
          <span><strong>${readiness.atRisk}</strong> At Risk</span>
          <span><strong>${readiness.notReady}</strong> Not Ready</span>
        </div>
        <div class="readiness-next-line">
          <div><span>Primary Readiness Gap</span><strong>${escapeHtml(primaryGapLabel)}</strong></div>
          <div><span>Next Best Action</span><strong>${escapeHtml(primaryActionLabel)}</strong></div>
        </div>
        <div class="how-readiness-works">
          <strong>Readiness Rule</strong>
          <p>Ready means assigned tech, certifications, equipment, clearance, pickup needs, and downstream coverage impact all check out.</p>
        </div>
        <div class="coverage-actions">
          <button class="primary-button" type="button" data-open-coverage="TRD-104">Find Coverage</button>
          <button class="ghost-button" type="button" data-page="dispatch">Open Dispatch</button>
        </div>
      </div>
    </section>

    ${renderTomorrowOpsBrief(opsBrief)}

    <section class="readiness-accordion-stack">
      ${renderAccordion("Critical Readiness Gaps", "3 Issues - 2 Need Coverage - 1 Needs Equipment", criticalBody, { open: true })}
      ${renderAccordion("Job Readiness Table", `${readiness.total} Jobs - ${readiness.ready} Ready - ${readiness.atRisk} At Risk - ${readiness.notReady} Not Ready`, tableBody, { open: true })}
      ${renderAccordion("Readiness Signals", "6 Checks Run - People, Certs, Equipment, Clearance, Pickup, Cascading Impact", signalsBody)}
      ${renderAccordion("Decision Log", `${state.emergencyDecisionLog.length || 0} Entries Today - Latest: ${latestDecision ? latestDecision.decisionType : "No Decision Yet"}`, decisionBody)}
      ${renderAccordion("90-Day Pilot", "Use Real Schedule, Technician, Certification, And Equipment Data", pilotBody)}
    </section>
    ${renderOperationalImpactSection(impactSnapshot)}
  `;
}

function renderReadinessDemo() {
  const metrics = getDemoMetrics();
  const selectedOrder = getDemoWorkOrder(state.selectedDemoWorkOrder);
  const selectedReadiness = evaluateDemoReadiness(selectedOrder);
  const coverageCandidates = getDemoCoverageCandidates(selectedOrder);
  const selectedCandidate = getSelectedDemoCandidate(selectedOrder);
  const selectedPacket = createWorkOrderPacketSummary(selectedOrder, selectedReadiness, selectedCandidate);
  const scriptSteps = getDemoScriptSteps();
  const activeScript = scriptSteps[state.demoScriptStep] || scriptSteps[0];
  const readinessJobs = getTomorrowReadinessData().jobs;
  const orderedJobs = filterAndSortReadinessJobs(readinessJobs, "coverageSchedule");
  const metricCards = [
    ["Tomorrow's Work", metrics.total, "info"],
    ["Ready", metrics.ready, "good"],
    ["At Risk", metrics.atRisk, "warn"],
    ["Not Ready", metrics.notReady, "bad"],
    ["Readiness Gaps", metrics.warnings + metrics.blockers, "warn"],
    ["Hard Gaps", metrics.blockers, "bad"]
  ];
  const selectedNeedsCoverage = selectedReadiness.status !== "Ready";
  const storyBadge = selectedNeedsCoverage ? `${selectedOrder.id} Needs Coverage` : `${selectedOrder.id} Ready`;
  const storyHeading = selectedNeedsCoverage
    ? "Assigned technician is unavailable."
    : `${selectedReadiness.assignedTech?.name || "Assigned technician"} is ready for dispatch.`;
  const storyCopy = selectedNeedsCoverage
    ? "Maria Lopez is the source-backed coverage recommendation after certification, equipment, and schedule-impact checks."
    : `${selectedOrder.id} is no longer the open blocker. Review the next readiness risk or open the Decision Log for the recorded approval.`;

  return `
    <section class="demo-command-hero">
      <div>
        <p class="eyebrow">Find Coverage</p>
        <h2>Assign qualified coverage without creating a new gap.</h2>
        <p>Compare available technicians by certification match, equipment access, ETA, pickup impact, and downstream schedule risk.</p>
      </div>
      <div class="demo-hero-actions">
        <button class="primary-button" type="button" data-demo-find-coverage>Find Coverage</button>
        <button class="ghost-button" type="button" data-page="command">Back to Tomorrow Readiness</button>
      </div>
    </section>

    ${renderDemoScriptPanel(scriptSteps, activeScript)}

    <section class="grid metric-grid critical demo-metrics">${metricCards.map(renderMetric).join("")}</section>

    <section class="coverage-story-card panel ${selectedOrder.id === "TRD-104" ? "active" : ""}">
      <div>
        <span class="badge ${selectedNeedsCoverage ? "bad" : "good"}">${escapeHtml(storyBadge)}</span>
        <h2>${escapeHtml(storyHeading)}</h2>
        <p>${escapeHtml(storyCopy)}</p>
      </div>
      <button class="${selectedNeedsCoverage ? "primary-button" : "ghost-button"}" type="button" ${selectedNeedsCoverage ? "data-demo-find-coverage" : "data-page=\"decisionlog\""}>${selectedNeedsCoverage ? "Find Coverage" : "Open Decision Log"}</button>
    </section>

    <section class="table-panel demo-schedule-panel ${["schedule", "not-ready"].includes(activeScript.target) ? "demo-script-highlight" : ""}">
        <div class="table-head">
          <div>
            <h2>Tomorrow Dispatch Board</h2>
            <p>Scan readiness by work order, assigned tech, service type, and required action.</p>
          </div>
          <span class="badge ${metrics.notReady ? "bad" : "good"}">${metrics.notReady} Not Ready</span>
        </div>
        ${renderReadinessControls(readinessJobs, "coverageSchedule")}
        <div class="data-table-wrap no-desktop-scroll">
          <table class="demo-schedule-table compact">
            <thead>
              <tr>
                <th>Readiness</th>
                <th>Time</th>
                <th>Work Order</th>
                <th>Service</th>
                <th>Site</th>
                <th>Technician</th>
                <th>Readiness Gaps</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orderedJobs.map(job => {
                const order = job.order;
                const readiness = job.readiness;
                return `
                  <tr class="clickable-row ${order.id === selectedOrder.id ? "selected-row" : ""}" data-demo-workorder="${order.id}" ${order.id === "TRD-104" ? `data-demo-target="trd-104-work-order"` : ""}>
                    <td><span class="badge ${readiness.tone}">${getReadinessDisplayStatus(readiness.status)}</span>${order.id === selectedOrder.id ? `<span class="badge info">Selected</span>` : ""}</td>
                    <td class="time-cell"><strong>${order.time}</strong></td>
                    <td>
                      <strong>${escapeHtml(order.id)}</strong>
                      <span class="subtle">${escapeHtml(order.project)}</span>
                    </td>
                    <td>${escapeHtml(getServiceDisplayName(order.service))}</td>
                    <td>${escapeHtml(order.location)}</td>
                    <td>${readiness.assignedTech ? escapeHtml(readiness.assignedTech.name) : "Unassigned"}</td>
                    <td>${renderReadinessGapDetails(job)}</td>
                    <td>${readiness.status === "Ready" ? `<span class="badge good">Ready</span>` : `<button class="link-button" type="button" data-demo-find-coverage>Find Coverage</button>`}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
    </section>

    <section class="panel demo-detail-panel wide ${["issues", "find"].includes(activeScript.target) ? "demo-script-highlight" : ""}">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Work Order Detail</p>
            <h2>${escapeHtml(selectedOrder.id)} / ${escapeHtml(getServiceDisplayName(selectedOrder.service))}</h2>
            <p>${escapeHtml(selectedOrder.project)} / ${escapeHtml(selectedOrder.location)}</p>
          </div>
          <span class="badge ${selectedReadiness.tone}">${selectedReadiness.status}</span>
        </div>
        ${renderReadinessPacket(selectedPacket)}
        <div class="coverage-detail-grid flat">
          <article class="selected-order">
            <h3>Summary</h3>
            <dl>
              <div><dt>Start</dt><dd>${escapeHtml(selectedOrder.time)}</dd></div>
              <div><dt>Priority</dt><dd>${escapeHtml(selectedOrder.priority)}</dd></div>
              <div><dt>Technician</dt><dd>${selectedReadiness.assignedTech?.name ? escapeHtml(selectedReadiness.assignedTech.name) : "Unassigned"}</dd></div>
              <div><dt>Status</dt><dd>${getReadinessDisplayStatus(selectedReadiness.status)}</dd></div>
            </dl>
            <p>${escapeHtml(selectedOrder.scope)}</p>
          </article>
          <article class="selected-order">
            <h3>Readiness Blockers</h3>
            <div class="gap-explain-list">
              ${selectedReadiness.reasons.map(reason => `
                <div>
                  <span class="badge ${selectedReadiness.tone}">${reason.includes("missing") ? "Readiness Gap" : reason.includes("Unavailable") || reason.includes("unavailable") ? "Coverage Gap" : "Readiness Gap"}</span>
                  <strong>${escapeHtml(reason.replace(/\.$/, ""))}</strong>
                  <p>Impact: ${escapeHtml(selectedOrder.id)} cannot run as currently assigned.</p>
                  <p>Fix: ${reason.includes("technician") || reason.includes("unavailable") ? "Assign qualified coverage" : "Resolve before dispatch"}</p>
                </div>
              `).join("")}
            </div>
          </article>
          <article class="selected-order">
            <h3>Work Order Requirements</h3>
            <div class="requirement-blocks">
              <div><span>Required Certs</span><strong>${renderSafeList(selectedOrder.requiredCerts)}</strong></div>
              <div><span>Required Equipment</span><strong>${renderSafeList(selectedOrder.requiredEquipment)}</strong></div>
              <div><span>Site Clearance</span><strong>${renderSafeList(selectedReadiness.requiredClearance || [])}</strong></div>
              <div><span>Pickup Needs</span><strong>${selectedOrder.hasCylinders ? `${escapeHtml(selectedOrder.cylinderCount)} ${escapeHtml(selectedOrder.cylinderType)} Cylinders - Pickup ${escapeHtml(selectedOrder.pickupDueDate)}` : "None"}</strong></div>
            </div>
          </article>
        </div>
        ${selectedOrder.hasCylinders ? renderCylinderPickupDetail(selectedOrder) : ""}
        <div class="coverage-actions">
          <button class="primary-button assign-button ${activeScript.target === "find" ? "demo-pulse" : ""}" type="button" data-demo-find-coverage>Find Coverage</button>
          <button class="ghost-button" type="button" data-open-pickup="${getCylinderPickupForWorkOrder(selectedOrder.id)?.id || "CP-501"}">Finalize Pickup Plan</button>
        </div>
    </section>

    ${state.demoCoverageOpen ? renderDemoCoverageScreen(selectedOrder, selectedReadiness, coverageCandidates, selectedCandidate, activeScript) : ""}
    ${state.demoDecision ? renderDemoDecisionOutcome(activeScript) : ""}
    ${state.demoDecision ? renderDemoBeforeAfter() : ""}
    ${state.demoDecision ? `<section class="pilot-cta panel immersive"><span class="badge info">Limited Pilot</span><h2>Test with anonymized real data.</h2><p>Use one week of schedule data, a technician roster, certifications, and equipment list to review real readiness blockers before dispatch.</p><button class="primary-button" type="button" data-page="dataintake">Open Pilot Setup</button></section>` : ""}
  `;
}

function renderDemoScriptPanel(steps, activeScript) {
  return `
    <section class="panel demo-script-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Guided Walkthrough</p>
          <h2>${state.demoScriptStep + 1}. ${activeScript.title}</h2>
          <p>${activeScript.prompt}</p>
        </div>
        <div class="demo-script-actions">
          <button class="ghost-button" type="button" data-demo-reset>Reset Workflow</button>
          <button class="ghost-button" type="button" data-demo-script-prev ${state.demoScriptStep === 0 ? "disabled" : ""}>Previous</button>
          <button class="primary-button" type="button" data-demo-script-next ${state.demoScriptStep === steps.length - 1 ? "disabled" : ""}>Next Step</button>
        </div>
      </div>
      <div class="demo-script-steps">
        ${steps.map((step, index) => `
          <button class="demo-script-step ${index === state.demoScriptStep ? "active" : ""} ${index < state.demoScriptStep ? "complete" : ""}" type="button" data-demo-script-step="${index}">
            <span>${index + 1}</span>
            <strong>${step.title}</strong>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCylinderPickupDashboardCard() {
  const metrics = getCylinderPickupMetrics();
  return `
    <section class="panel cylinder-dashboard-card">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Readiness Preview</p>
          <h2>Cylinder Pickup Tracker</h2>
          <p>Operational readiness for field cylinders and pickup obligations. This does not include lab results, break schedules, sample login, or report authoring.</p>
        </div>
        <button class="primary-button" type="button" data-optimize-pickups>Plan Pickups</button>
      </div>
      <div class="cylinder-metric-grid">
        <div><span>Cylinder Pickups Due Tomorrow</span><strong>${metrics.dueTomorrow}</strong></div>
        <div><span>Unassigned pickups</span><strong>${metrics.unassigned}</strong></div>
        <div><span>Overdue pickups</span><strong>${metrics.overdue}</strong></div>
      </div>
    </section>
  `;
}

function renderCylinderPickupDetail(order) {
  const pickup = getCylinderPickupForWorkOrder(order.id);
  if (!pickup) {
    return `
      <div class="cylinder-detail-card">
        <div class="panel-head compact">
          <div>
            <h3>Cylinder Pickup</h3>
            <p>${escapeHtml(order.cylinderCount)} ${escapeHtml(String(order.cylinderType || "").toLowerCase())} cylinders noted on the work order. No active pickup obligation is due in this workflow.</p>
          </div>
        </div>
      </div>
    `;
  }
  const evaluation = evaluateCylinderPickup(pickup);
  return `
    <div class="cylinder-detail-card">
      <div class="panel-head compact">
        <div>
          <h3>Cylinder Pickup</h3>
          <p>${escapeHtml(pickup.projectName)} / ${escapeHtml(pickup.jobLocation)}</p>
        </div>
        <span class="badge ${evaluation.tone}">${escapeHtml(evaluation.readiness)}</span>
      </div>
      <dl>
        <div><dt>Type</dt><dd>${escapeHtml(pickup.cylinderType)}</dd></div>
        <div><dt>Count</dt><dd>${escapeHtml(pickup.cylinderCount)}</dd></div>
        <div><dt>Cast date</dt><dd>${escapeHtml(pickup.castDate)}</dd></div>
        <div><dt>Pickup due</dt><dd>${escapeHtml(pickup.pickupDueDate)}</dd></div>
        <div><dt>Pickup status</dt><dd><span class="badge ${toneForCylinderPickup(evaluation)}">${escapeHtml(evaluation.status)}</span></dd></div>
        <div><dt>Assigned pickup tech</dt><dd>${escapeHtml(evaluation.assignedTech?.name || "Unassigned")}</dd></div>
      </dl>
      <p>${escapeHtml(pickup.specialInstructions)}</p>
      <button class="ghost-button" type="button" data-open-pickup="${escapeHtml(pickup.id)}">Assign Pickup</button>
    </div>
  `;
}

function toneForCylinderPickup(evaluation) {
  if (evaluation.overdue || evaluation.readiness === "Not Ready") return "bad";
  if (evaluation.dueTomorrow || evaluation.readiness === "At Risk") return "warn";
  return "info";
}

function renderCylinderReadinessIssueList() {
  const issues = getCylinderReadinessIssues();
  return `
    <section class="panel cylinder-issues-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Readiness Issues List</p>
          <h2>Cylinder pickup readiness issues</h2>
          <p>Pickup obligations are treated as tomorrow-readiness signals only.</p>
        </div>
        <span class="badge warn">${issues.length} pickup signals</span>
      </div>
      <div class="status-list">
        ${issues.map(item => `
          <button class="alert-row cylinder-issue-row" type="button" data-open-pickup="${escapeHtml(item.pickup.id)}">
            <span class="dot ${item.tone}"></span>
            <span><strong>${escapeHtml(item.issue)}</strong><br><span class="subtle">${escapeHtml(item.pickup.projectName)} / ${escapeHtml(item.pickup.cylinderCount)} ${escapeHtml(String(item.pickup.cylinderType || "").toLowerCase())} cylinders / ${escapeHtml(item.assignedTech?.name || "Unassigned")}</span></span>
            <span class="badge ${item.tone}">${escapeHtml(item.status)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCylinderLocationBoard() {
  return `
    <section class="panel cylinder-location-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Map / Location Preview</p>
          <h2>Field cylinder pickup locations</h2>
          <p>Mock location board for jobsites with pickup obligations. No real map API is used.</p>
        </div>
        <span class="badge info">${cylinderPickups.length} pickup records</span>
      </div>
      <div class="cylinder-location-board">
        ${cylinderPickups.map((pickup, index) => {
          const evaluation = evaluateCylinderPickup(pickup);
          const labels = [
            `${pickup.cylinderCount} ${pickup.cylinderType.toLowerCase()} cylinders on site`,
            evaluation.overdue ? "Overdue pickup" : evaluation.dueTomorrow ? "Pickup due tomorrow" : "Future pickup",
            evaluation.assignedTech ? `Assigned to ${evaluation.assignedTech.name}` : "Pickup unassigned"
          ];
          return `
            <button class="cylinder-marker ${evaluation.tone}" type="button" data-open-pickup="${escapeHtml(pickup.id)}" style="--x:${16 + (index * 19) % 68}%;--y:${18 + (index * 23) % 56}%;">
              <strong>${escapeHtml(pickup.projectName)}</strong>
              ${labels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPickupSuggestionsPanel() {
  const pickup = getSelectedCylinderPickup();
  const evaluation = evaluateCylinderPickup(pickup);
  const suggestions = getPickupSuggestions(pickup);
  const selected = suggestions.find(item => item.tech.id === state.selectedPickupTech) || suggestions[0];
  return `
    <section class="panel pickup-suggestions-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Pickup Coverage Suggestions</p>
          <h2>Assign pickup for ${escapeHtml(pickup.projectName)}</h2>
          <p>${escapeHtml(pickup.cylinderCount)} ${escapeHtml(String(pickup.cylinderType || "").toLowerCase())} cylinders / due ${escapeHtml(pickup.pickupDueDate)} / current status: ${escapeHtml(evaluation.status)}</p>
        </div>
        <span class="badge ${evaluation.tone}">${escapeHtml(evaluation.readiness)}</span>
      </div>
      <div class="pickup-suggestion-layout">
        <div class="pickup-suggestion-list">
          ${suggestions.map(item => `
            <button class="pickup-suggestion ${item.tech.id === selected.tech.id ? "selected" : ""}" type="button" data-pickup-tech="${escapeHtml(item.tech.id)}">
              <div class="demo-candidate-head">
                <strong>${escapeHtml(item.tech.name)}</strong>
                <span class="badge ${item.canAssign ? toneForScore(item.score) : "bad"}">${item.score}% Match</span>
              </div>
              <p>${escapeHtml(item.explanation)}</p>
              <div class="match-meta">
                <span>${escapeHtml(item.tech.currentRoute || "Available route")}</span>
                <span>${item.tech.returningToOffice ? "Returning to lab/office" : "Not returning to office"}</span>
              </div>
            </button>
          `).join("")}
        </div>
        <aside class="demo-decision-panel">
          <h3>Pickup Assignment</h3>
          <div class="selected-order">
            <span class="badge ${selected.canAssign ? "good" : "bad"}">${selected.canAssign ? "Recommended" : "Not available"}</span>
            <strong>${escapeHtml(selected.tech.name)}</strong>
            <span class="subtle">${escapeHtml(selected.reason)}</span>
            <dl>
              <div><dt>Extra drive time</dt><dd>${escapeHtml(selected.tech.estimatedExtraDriveTime || 18)} min</dd></div>
              <div><dt>Distance</dt><dd>${escapeHtml(selected.tech.estimatedDistanceFromPickup || "n/a")} mi</dd></div>
              <div><dt>Returning</dt><dd>${selected.tech.returningToOffice ? "Yes" : "No"}</dd></div>
            </dl>
          </div>
          <button class="primary-button assign-button" type="button" data-assign-pickup="${escapeHtml(selected.tech.id)}" ${selected.canAssign ? "" : "disabled"}>
            Assign Pickup to ${escapeHtml(selected.tech.name)}
          </button>
        </aside>
      </div>
    </section>
  `;
}

function renderPickupRoutePreview() {
  const route = getPickupRoutePreview();
  if (!route) return "";
  return `
    <section class="panel pickup-route-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Pickup Route Preview</p>
          <h2>${escapeHtml(route.tech?.name || "Technician")} pickup route</h2>
          <p>Mock route order only. No real routing API is used.</p>
        </div>
        <span class="badge info">${escapeHtml(route.stopCount)} stops / ${escapeHtml(route.driveTime)} min est.</span>
      </div>
      <div class="pickup-route">
        ${route.orderedStops.map((stop, index) => `<span>${escapeHtml(index + 1)}. ${escapeHtml(stop)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderDemoCoverageScreen(order, readiness, candidates, selectedCandidate, activeScript = { target: "" }) {
  const selectedId = selectedCandidate?.tech.id || "";
  const visibleCandidates = candidates.filter(candidate => candidate.canAssign).slice(0, 4);
  const nearMatches = candidates.filter(candidate => !candidate.canAssign).slice(0, 3);
  const handoff = selectedCandidate ? createCoverageHandoffSummary(order, readiness, selectedCandidate) : null;
  return `
    <section class="panel demo-coverage-screen ${["coverage", "note", "assign"].includes(activeScript.target) ? "demo-script-highlight" : ""}">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Coverage Options</p>
          <h2>Coverage Plan For ${escapeHtml(order.id)}</h2>
          <p>Ranks qualified technicians by availability, certification match, clearance, equipment access, ETA, pickup impact, and schedule impact.</p>
        </div>
        <span class="badge ${readiness.tone}">Current: ${escapeHtml(readiness.status)}</span>
      </div>
      <div class="demo-coverage-layout">
        <div class="demo-candidate-list ${activeScript.target === "coverage" ? "demo-script-highlight-soft" : ""}">
          <h3>Qualified Technician Review</h3>
          ${visibleCandidates.length ? visibleCandidates.map((candidate, index) => `
            <button class="demo-candidate ${candidate.tech.id === selectedId ? "selected" : ""}" type="button" data-demo-tech="${escapeHtml(candidate.tech.id)}" ${candidate.tech.name === "Maria Lopez" ? `data-demo-target="maria-coverage-recommendation"` : ""}>
              <div class="demo-candidate-head">
                <strong>${escapeHtml(candidate.tech.name)}</strong>
                <span class="badge ${candidate.canAssign ? candidate.evaluation.tone : "bad"}">${candidate.canAssign && index === 0 ? "Recommended" : candidate.canAssign ? `${candidate.score}% Match` : "Not Qualified"}</span>
              </div>
              <p>${escapeHtml(candidate.tech.pickupNote || "Can support the assignment without creating a new readiness gap.")}</p>
              <div class="match-meta">
                <span>${escapeHtml(candidate.score)}% Coverage Fit</span>
                <span>${candidate.sameOffice ? "Same-office match" : "Other-office match"}</span>
                <span>ETA: ${escapeHtml(candidate.tech.distance)}</span>
              </div>
              <div class="candidate-signal-grid">
                <div><span>Certification Match</span><strong>${candidate.evaluation.blockers.some(reason => reason.includes("missing") || reason.includes("expired")) ? "Needs Review" : "Meets Required Certs"}</strong></div>
                <div><span>Clearance</span><strong>${candidate.clearanceMatch ? "Cleared" : "Clearance Gap"}</strong></div>
                <div><span>Equipment Access</span><strong>${candidate.equipmentAccess ? "Available" : "Needs Equipment Plan"}</strong></div>
                <div><span>ETA</span><strong>${escapeHtml(candidate.tech.distance)}</strong></div>
                <div><span>Home Base</span><strong>${renderSafeText(candidate.tech.homeBase || candidate.tech.branch)}</strong></div>
                <div><span>Preferred End Area</span><strong>${renderSafeText(candidate.tech.preferredEndArea || "South Office Corridor")}</strong></div>
                <div><span>Cascading Impact</span><strong>${escapeHtml(candidate.impact.label)}</strong></div>
                <div><span>Drive Time Impact</span><strong>Reduces extra miles</strong></div>
                <div><span>Pickup Impact</span><strong>${candidate.tech.returningToOffice ? "Can Return Cylinders" : "Finalize Pickup Plan"}</strong></div>
              </div>
              <div class="demo-candidate-reasons">
                ${(candidate.evaluation.blockers.length || candidate.evaluation.warnings.length
                  ? [...candidate.evaluation.blockers, ...candidate.evaluation.warnings]
                  : ["Meets required certifications, availability, equipment, and calibration checks."])
                  .slice(0, 3)
                  .map(reason => `<span>${escapeHtml(reason)}</span>`).join("")}
              </div>
            </button>
          `).join("") : `
            <article class="coverage-note bad">
              <strong>No valid internal coverage option is currently available.</strong>
              <span>Every candidate has a hard blocker or creates another readiness gap. Review near matches, partner coverage, or manager escalation before claiming this job is resolved.</span>
            </article>
          `}
          ${nearMatches.length ? `
            <details class="near-match-details" ${visibleCandidates.length ? "" : "open"}>
              <summary>Near Matches (${nearMatches.length})</summary>
              <div class="status-list">
                ${nearMatches.map(candidate => `
                  <article class="coverage-note warn">
                    <strong>${escapeHtml(candidate.tech.name)} - ${escapeHtml(candidate.label)}</strong>
                    <span>${escapeHtml(candidate.evaluation.blockers[0] || candidate.impact.detail || "Needs manager review before coverage.")}</span>
                  </article>
                `).join("")}
              </div>
            </details>
          ` : ""}
        </div>
        <aside class="demo-decision-panel ${["note", "assign"].includes(activeScript.target) ? "demo-script-highlight-soft" : ""}">
          ${handoff ? renderCoverageHandoffPacket(handoff) : ""}
          <h3>Coverage Approval</h3>
          ${selectedCandidate ? `
            <div class="selected-order">
              <span class="badge ${selectedCandidate.evaluation.tone}">${selectedCandidate.evaluation.status} after reassignment</span>
              <strong>${escapeHtml(selectedCandidate.tech.name)}</strong>
              <span class="subtle">${selectedCandidate.sameOffice ? "Same-office coverage" : "Other-office coverage"} / ${escapeHtml(selectedCandidate.tech.distance)}</span>
              <dl>
                <div><dt>Certifications</dt><dd>${renderSafeList(order.requiredCerts.map(cert => getDemoCert(selectedCandidate.tech, cert)?.name || `Missing ${cert}`))}</dd></div>
                <div><dt>Clearance</dt><dd>${selectedCandidate.clearanceMatch ? renderSafeList(order.requiredClearance) : "Missing required clearance"}</dd></div>
                <div><dt>Equipment plan</dt><dd>${renderSafeList(selectedCandidate.evaluation.equipmentPlan.map(item => `${item.name} (${item.status})`))}</dd></div>
                <div><dt>Cascading impact</dt><dd>${escapeHtml(selectedCandidate.impact.detail)}</dd></div>
                <div><dt>Pickup impact</dt><dd>${selectedCandidate.tech.returningToOffice ? "Can return cylinders to the lab with the route." : "Finalize pickup plan after coverage."}</dd></div>
                <div><dt>Remaining risks</dt><dd>${selectedCandidate.evaluation.warnings.length ? renderSafeList(selectedCandidate.evaluation.warnings) : "No remaining readiness warnings."}</dd></div>
              </dl>
            </div>
            <div class="pickup-impact-choice">
              <strong>Pickup Risk</strong>
              <p>Concrete cylinders need end-of-day return planning. Finalize pickup after coverage so the route does not create a new gap.</p>
              <div class="coverage-actions compact">
                <button class="ghost-button" type="button" data-open-pickup="${escapeHtml(getCylinderPickupForWorkOrder(order.id)?.id || "CP-501")}">Assign Pickup Now</button>
                <button class="ghost-button" type="button" data-open-pickup="${escapeHtml(getCylinderPickupForWorkOrder(order.id)?.id || "CP-501")}">Finalize Pickup Plan After Coverage</button>
              </div>
            </div>
            <label class="form-grid">
              <span>Decision Note</span>
              <textarea class="field-input ${activeScript.target === "note" ? "demo-pulse" : ""}" rows="5" data-demo-note placeholder="Example: Assign Maria Lopez for the 7:30 AM pour. Use SC-18, AM-09, TH-03, and CM-44 from Springfield field cage.">${escapeHtml(state.demoDecisionNote)}</textarea>
            </label>
            <button class="primary-button assign-button ${activeScript.target === "assign" ? "demo-pulse" : ""}" type="button" data-demo-assign="${escapeHtml(selectedCandidate.tech.id)}" ${selectedCandidate.tech.name === "Maria Lopez" ? `data-demo-target="approve-coverage-plan"` : ""} ${selectedCandidate.canAssign && readiness.status !== "Ready" ? "" : "disabled"}>
              ${readiness.status === "Ready" ? "Coverage Already Approved" : selectedCandidate.canAssign ? "Approve Coverage Plan" : "Coverage Not Feasible"}
            </button>
            ${selectedCandidate.canAssign && readiness.status !== "Ready" ? "" : `<p class="subtle">${readiness.status === "Ready" ? "This work order is already ready; open the Decision Log for the recorded approval." : "This candidate cannot be assigned because a hard blocker or downstream gap remains."}</p>`}
          ` : `<div class="empty-state">No candidate selected.</div>`}
        </aside>
      </div>
    </section>
  `;
}

function renderDemoDecisionOutcome(activeScript = { target: "" }) {
  const decision = state.demoDecision;
  return `
    <section class="panel demo-outcome-panel ${activeScript.target === "outcome" ? "demo-script-highlight" : ""}">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Coverage Plan Approved</p>
          <h2>${escapeHtml(decision.workOrder)} Reassigned To ${escapeHtml(decision.technician)}</h2>
          <p>${escapeHtml(decision.note || "No decision note entered.")}</p>
        </div>
        <span class="badge ${decision.tone}">${decision.status}</span>
      </div>
      <div class="grid three">
        <div class="activity-row"><strong>Decision time</strong><span class="subtle">${escapeHtml(decision.timestamp)}</span></div>
        <div class="activity-row"><strong>Equipment plan</strong><span class="subtle">${escapeHtml(decision.equipmentPlan)}</span></div>
        <div class="activity-row"><strong>Remaining risks</strong><span class="subtle">${escapeHtml(decision.remainingRisks)}</span></div>
      </div>
      <div class="impact-callout">
        <strong>Impact</strong>
        <span>${escapeHtml(decision.impactLanguage || "Coverage decision recorded for tomorrow readiness.")}</span>
      </div>
    </section>
  `;
}

function renderDemoBeforeAfter() {
  const before = [
    "6:30 AM Fire Drill",
    "Manual Phone Calls",
    "Unclear Coverage",
    "Unknown Pickup Plan",
    "Risk Of Missed Pour"
  ];
  const after = [
    "Qualified Coverage Approved",
    "Maria Lopez Assigned",
    "No New Schedule Gap Created",
    "Pickup Plan Finalized",
    "Decision Logged Before Tomorrow Starts"
  ];
  return `
    <section class="before-after-grid immersive-payoff">
      <article class="panel before-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Before CMTCommand</p>
            <h2>Avoid The 6:30 AM Fire Drill.</h2>
          </div>
        </div>
        <div class="status-list">${before.map(item => `<div class="alert-row"><span class="dot bad"></span><span>${item}</span></div>`).join("")}</div>
      </article>
      <article class="panel after-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">After CMTCommand</p>
            <h2>See What Breaks Before Tomorrow Does.</h2>
          </div>
        </div>
        <div class="status-list">${after.map(item => `<div class="alert-row"><span class="dot good"></span><span>${item}</span></div>`).join("")}</div>
      </article>
    </section>
  `;
}

function renderPilotRequestForm() {
  return `
    <section class="panel pilot-request-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">90-Day Pilot Request</p>
          <h2>Capture pilot interest during the conversation.</h2>
          <p>For now, submissions are stored in this browser session and shown as a local confirmation. No backend is required.</p>
        </div>
        <span class="badge info">${state.pilotRequests.length} local ${state.pilotRequests.length === 1 ? "request" : "requests"}</span>
      </div>
      ${state.pilotConfirmation ? `<div class="success-banner">${escapeHtml(state.pilotConfirmation)}</div>` : ""}
      <form class="pilot-request-form" data-pilot-form>
        <label>Name<input class="field-input" name="name" required></label>
        <label>Company<input class="field-input" name="company" required></label>
        <label>Role<input class="field-input" name="role" required></label>
        <label>Email<input class="field-input" name="email" type="email" required></label>
        <label>Phone<input class="field-input" name="phone" type="tel"></label>
        <label>Number of technicians<input class="field-input" name="technicians" type="number" min="1" placeholder="25"></label>
        <label>Current dispatch method
          <select class="field-input" name="dispatchMethod">
            <option>Whiteboard</option>
            <option>Spreadsheet</option>
            <option>Text messages and phone calls</option>
            <option>Existing field software plus manual dispatch</option>
            <option>Other</option>
          </select>
        </label>
        <label>Interested in 90-day pilot
          <select class="field-input" name="pilotInterest">
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>
        <label class="wide">Biggest readiness problem
          <textarea class="field-input" name="readinessProblem" rows="4" placeholder="Example: Certification and equipment issues are found after dispatch is already set."></textarea>
        </label>
        <button class="primary-button" type="submit">Submit Pilot Request Locally</button>
      </form>
    </section>
  `;
}

function renderDiscoveryQuestions() {
  const questions = [
    "Would this replace any spreadsheet, whiteboard, or text-message process you use today?",
    "What part of this workflow feels most realistic?",
    "What is missing before you would trust this?",
    "Who at your company would use this every day?",
    "What would this need to do for you to pay for it?"
  ];
  return `
    <section class="panel discovery-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Customer Discovery Questions</p>
          <h2>Use these prompts after the reassignment moment.</h2>
          <p>Keep the conversation anchored on tomorrow readiness, not a broader operations suite.</p>
        </div>
      </div>
      <div class="discovery-question-grid">
        ${questions.map((question, index) => `
          <article class="discovery-question">
            <span>${index + 1}</span>
            <strong>${question}</strong>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMetric([label, value, tone]) {
  return `
    <article class="metric-card ${tone}">
      <span class="metric-label">${label}</span>
      <strong>${value}</strong>
      <span class="metric-hint">${metricHint(label)}</span>
    </article>
  `;
}

function metricHint(label) {
  const hints = {
    "Resource readiness": "Weighted by staffing and equipment",
    "Estimated revenue today": "Scheduled billable work",
    "Average utilization": "Field staff current load",
    "Tomorrow's Work": "Scheduled work orders for the next workday",
    "Ready": "All known requirements cleared",
    "At Risk": "One or more items need review",
    "Not Ready": "Hard blocker before dispatch",
    "Expiring Certifications": "Credentials needing renewal review",
    "Calibration Warnings": "Equipment calibration or hold issues"
  };
  return hints[label] || "Live sample operations data";
}

function projectReadiness(project) {
  const orders = workOrders.filter(w => w.projectId === project.id && w.status !== "Complete");
  const requiredCerts = [...new Set(orders.flatMap(w => w.requiredCerts))];
  const requiredEquipment = [...new Set(orders.flatMap(w => w.requiredEquipment))];
  const qualified = requiredCerts.every(cert => technicians.some(t => t.certifications.includes(cert) && t.status !== "Unavailable" && t.status !== "Off duty"));
  const equipReady = requiredEquipment.every(req => equipment.some(e => e.category.includes(req.split(" ")[0]) || e.id.includes(req.split(" ")[0])));
  const labReady = concreteSets.filter(s => s.project === project.name && s.breaksDue === "Overdue").length < 2;
  const pmReady = project.actualHours / project.budgetHours < 0.9;
  const score = 50 + (qualified ? 18 : 4) + (equipReady ? 12 : 4) + (labReady ? 10 : 2) + (pmReady ? 10 : 1);
  const missing = [];
  if (!qualified) missing.push(requiredCerts.find(cert => !technicians.some(t => t.certifications.includes(cert))) || "qualified technician");
  if (!equipReady) missing.push("required equipment");
  if (!labReady) missing.push("lab capacity");
  if (!pmReady) missing.push("PM budget review");
  return {
    score: Math.min(98, score),
    required: [
      `${Math.max(1, Math.ceil(orders.length / 3))} qualified technicians`,
      requiredCerts[0] || "certified inspector",
      requiredEquipment[0] || "field kit",
      "PM review"
    ],
    missing
  };
}

function previewPanel(title, lines, page) {
  return `
    <article class="panel">
      <div class="panel-head">
        <div>
          <h2>${title}</h2>
          <p>${lines[0]}</p>
        </div>
        <button class="ghost-button" type="button" data-page="${page}">Open</button>
      </div>
      <div class="status-list">
        ${lines.map((line, index) => `<div class="activity-row"><strong>${line}</strong><span class="subtle">${index === 0 ? "Primary signal" : "Supporting signal"}</span></div>`).join("")}
      </div>
    </article>
  `;
}

function renderDispatch() {
  const selected = workOrders.find(w => w.id === state.selectedWorkOrder) || workOrders.find(w => !w.techId);
  const ranked = rankTechnicians(selected);
  const bestMatch = ranked.find(item => item.qualified) || ranked[0];
  const readiness = getTomorrowReadinessData();
  const statusFilter = state.filters["dispatch:status"] || "All";
  const serviceFilter = state.filters["dispatch:service"] || "All";
  const techFilter = state.filters["dispatch:technician"] || "All";
  const sortKey = state.sorts.dispatch?.key || "time";
  const dispatchRows = workOrders
    .filter(order => statusFilter === "All" || order.status === statusFilter)
    .filter(order => serviceFilter === "All" || order.service === serviceFilter)
    .filter(order => techFilter === "All" || order.technician === techFilter)
    .sort((a, b) => {
      if (sortKey === "eta") return locationDistance(bestMatch?.tech || technicians[0], a) - locationDistance(bestMatch?.tech || technicians[0], b);
      if (sortKey === "readiness") return toneForStatus(a.status).localeCompare(toneForStatus(b.status));
      return a.requiredTime.localeCompare(b.requiredTime);
    })
    .slice(0, 12);
  const filterSelect = (key, label, values) => `
    <label>${label}
      <select data-filter-key="dispatch:${key}">
        ${["All", ...values].map(value => `<option value="${value}" ${(state.filters[`dispatch:${key}`] || "All") === value ? "selected" : ""}>${value}</option>`).join("")}
      </select>
    </label>
  `;
  logLocationView("Dispatch Map");
  return `
    <section class="panel dispatch-hero-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Dispatch</p>
          <h2>Where Are The Jobs, Who Can Cover, And What Breaks If We Move Someone?</h2>
          <p>Uses work-hours dispatch context to estimate coverage and drive time. No after-hours movement history is shown.</p>
        </div>
        <button class="primary-button" type="button" data-open-coverage="TRD-104">Find Coverage for TRD-104</button>
      </div>
      <div class="grid three">
        <div class="activity-row"><strong>${readiness.ready} Ready</strong><span class="subtle">Can proceed</span></div>
        <div class="activity-row"><strong>${readiness.atRisk} At Risk</strong><span class="subtle">Needs review before dispatch</span></div>
        <div class="activity-row"><strong>${readiness.notReady} Not Ready</strong><span class="subtle">Coverage gap or readiness gap</span></div>
      </div>
    </section>
    <section class="dispatch-command">
      <aside class="panel dispatch-list-panel">
        <div class="panel-head">
          <div>
            <h2>Today's Work Orders</h2>
            <p>Compact dispatch list. Select a row to highlight the map and ETA recommendation.</p>
          </div>
        </div>
        <div class="table-control-bar compact">
          ${filterSelect("status", "Filter By Status", [...new Set(workOrders.map(order => order.status))])}
          ${filterSelect("service", "Filter By Service Type", [...new Set(workOrders.map(order => order.service))])}
          ${filterSelect("technician", "Filter By Technician", [...new Set(workOrders.map(order => order.technician))])}
          <label>Sort By
            <select data-sort-key="dispatch">
              ${[["time", "Time"], ["eta", "ETA"], ["readiness", "Readiness"]].map(([value, label]) => `<option value="${value}" ${sortKey === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="dispatch-row-list">
          ${dispatchRows.map(order => `
            <button class="dispatch-row ${order.id === selected.id ? "selected" : ""}" type="button" data-dispatch-order="${order.id}">
              <span class="badge ${toneForStatus(order.status)}">${order.status}</span>
              <strong>${order.id} - ${getServiceDisplayName(order.service)}</strong>
              <span>${order.project}</span>
              <small>${order.requiredTime} - ${order.technician}</small>
            </button>
          `).join("")}
        </div>
      </aside>
      <div class="map-panel panel dispatch-map-main">
        <div class="panel-head">
          <div>
            <h2>Dispatch Location Preview</h2>
            <p>Illustrative work-hours map with job pins, technician pins, office/lab, route lines, and ETA badges. No real map API is used.</p>
          </div>
          <div class="panel-actions">
            <span class="badge bad">${workOrders.filter(w => !w.techId).length} unassigned</span>
            <span class="badge info">${technicians.filter(t => t.status === "Available").length} available techs</span>
          </div>
        </div>
        <div class="map-canvas" aria-label="Illustrative dispatch map">
          ${renderRoads()}
          <span class="map-route selected" style="left:38%;top:42%;width:45%;transform:rotate(18deg);"></span>
          <button class="map-pin lab selected" title="Springfield Lab / Office" style="left:34%;top:44%;">LAB</button>
          ${projects.map((p, i) => `<button class="map-pin project ${selected.project === p.name ? "selected" : ""}" title="${p.name}" style="left:${12 + i * 16}%;top:${18 + (i % 3) * 21}%;">${selected.project === p.name ? "SEL" : "JOB"}</button>`).join("")}
          ${renderTechnicianLocationPins(selected)}
          ${["1", "2", "3"].map((n, i) => `<button class="map-pin rig" title="Drill Rig ${n}" style="left:${68 + i * 7}%;top:${20 + i * 16}%;">R</button>`).join("")}
          ${equipment.slice(0, 4).map((e, i) => `<button class="map-pin equipment" title="${e.id} - ${e.status}" style="left:${36 + i * 12}%;top:${31 + i * 10}%;">E</button>`).join("")}
          <button class="map-pin emergency" title="Emergency request" style="left:83%;top:65%;">!</button>
          ${bestMatch ? `<span class="eta-badge" style="left:66%;top:59%;">${bestMatch.tech.name} - ${locationDistance(bestMatch.tech, selected) + 10} Min</span>` : ""}
          <div class="map-legend">
            <span><i class="dot info"></i> Job site</span>
            <span><i class="dot good"></i> Work-hour technician</span>
            <span><i class="dot info"></i> Office / Lab</span>
            <span><i class="dot"></i> Drill rig</span>
            <span><i class="dot warn"></i> Equipment</span>
            <span><i class="dot bad"></i> Emergency</span>
          </div>
        </div>
        ${renderFieldStatusPanel(selected)}
      </div>
    </section>
    <section class="panel dispatch-panel">
        <div class="panel-head">
          <div>
            <h2>Coverage Recommendation</h2>
            <p>CMTCommand found one clean internal coverage option and one partner fallback. ${escapeHtml(bestMatch?.tech.name || "The recommended technician")} is recommended because the rules-based check balances certification, clearance, equipment, ETA, pickup needs, and cascading impact.</p>
          </div>
        </div>
        <label class="form-grid dispatch-select">
          <span>Work Order</span>
          <select id="dispatchWorkOrder" class="field-input">
            ${workOrders.filter(w => !w.techId || w.status === "Problem / delayed").slice(0, 12).map(w => `<option ${w.id === selected.id ? "selected" : ""} value="${escapeHtml(w.id)}">${escapeHtml(w.id)} - ${escapeHtml(w.service)}</option>`).join("")}
          </select>
        </label>
        <div class="selected-order">
          <span class="badge ${toneForStatus(selected.status)}">${escapeHtml(selected.status)}</span>
          <strong>${escapeHtml(selected.project)}</strong>
          <span class="subtle">${escapeHtml(selected.id)} / ${escapeHtml(selected.service)}</span>
          <dl>
            <div><dt>Required</dt><dd>${escapeHtml(selected.requiredTime)}</dd></div>
            <div><dt>Priority</dt><dd>${escapeHtml(selected.priority)}</dd></div>
            <div><dt>Equipment</dt><dd>${renderSafeList(selected.requiredEquipment)}</dd></div>
          </dl>
          <div class="pill-list">${selected.requiredCerts.map(c => `<span class="badge info">${escapeHtml(c)}</span>`).join("")}</div>
        </div>
        <div class="status-list">
          ${ranked.map(item => `
            <div class="recommendation-row">
              <div style="display:flex;justify-content:space-between;gap:10px;">
                <strong>${escapeHtml(item.tech.name)} - ${escapeHtml(locationDistance(item.tech, selected) + 10)} Min To ${escapeHtml(selected.id)}</strong>
                <span class="badge ${item.tone}">${escapeHtml(item.label)}</span>
              </div>
              <span class="subtle">Currently: ${escapeHtml(item.tech.location?.nearestProject || "Last known job check-in")} - Home Base: ${escapeHtml(item.tech.location?.label || item.tech.branch)} - Equipment: ${escapeHtml(item.tech.equipment)}</span>
              <div class="progress ${item.tone}"><span style="width:${Math.max(0, Math.min(100, Number(item.score) || 0))}%"></span></div>
              <div class="match-meta">
                <span>${escapeHtml(item.score)}% Match</span>
                <span>${escapeHtml(item.tech.equipment)}</span>
              </div>
              ${item.qualified ? "" : `<span class="badge bad">Missing Required Cert</span>`}
            </div>
          `).join("")}
        </div>
        <button class="primary-button assign-button" type="button">${bestMatch?.qualified ? `Assign ${escapeHtml(bestMatch.tech.name)}` : "Assign Technician"}</button>
    </section>
    ${renderCoverageImpactAnalysis()}
  `;
}

function renderCoverageImpactAnalysis() {
  const analysis = analyzeEmergencyDispatch();
  const visibleCategories = analysis.categories.filter(category => {
    const items = analysis.candidates.filter(item => item.category === category);
    if (!items.length) return false;
    return !["Backup With Risk", "Not Qualified"].includes(category);
  });
  const nearMatches = analysis.candidates.filter(item => item.category === "Backup With Risk" || item.category === "Not Qualified");
  return `
    <section class="coverage-panel panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Emergency Dispatch Workflow</p>
          <h2>Coverage Impact Analysis</h2>
          <p>Choose the cleanest coverage path, then record the decision after the impact is understood.</p>
        </div>
        <span class="badge bad">${emergencyRequest.priority}</span>
      </div>
      <div class="emergency-request-card">
        <div>
          <span class="subtle">Emergency request</span>
          <strong>${emergencyRequest.project}</strong>
          <span>${emergencyRequest.contractor} called after a last-minute concrete truck was added to the schedule.</span>
        </div>
        <dl>
          <div><dt>Service</dt><dd>${emergencyRequest.service}</dd></div>
          <div><dt>Truck ETA</dt><dd>${emergencyRequest.truckEta}</dd></div>
          <div><dt>Certification</dt><dd>${emergencyRequest.requiredCerts.join(", ")}</dd></div>
          <div><dt>Access</dt><dd>${emergencyRequest.requiredAccess.join(", ")}</dd></div>
          <div><dt>Equipment</dt><dd>${emergencyRequest.requiredEquipment.join(", ")}</dd></div>
        </dl>
      </div>
      <div class="coverage-actions">
        <button class="primary-button" type="button" data-emergency-decision="direct">Assign Direct Match</button>
        <button class="primary-button" type="button" data-emergency-decision="coverage">Assign With Coverage Plan</button>
        <button class="ghost-button" type="button" data-emergency-decision="outsource">Partner Firm Review</button>
        <button class="ghost-button" type="button" data-emergency-decision="escalate">Escalate / Manager Override</button>
      </div>
      <div class="dispatch-option-explain">
        <article><strong>Assign Direct Match</strong><span>A technician can cover this job without creating another readiness gap.</span></article>
        <article><strong>Assign With Coverage Plan</strong><span>A technician can cover this job, but their current assignment also needs a replacement. CMTCommand proposes the chain.</span></article>
        <article><strong>Partner Firm Review</strong><span>No clean internal option is available, so review approved partner firms.</span></article>
        <article><strong>Escalate / Manager Override</strong><span>No recommended option meets the rules. A manager must approve the risk or change the schedule.</span></article>
      </div>
      <div class="coverage-category-grid">
        ${visibleCategories.map(category => renderCoverageCategory(category, analysis.candidates.filter(item => item.category === category))).join("")}
        ${renderOutsourceRecommendation(analysis)}
      </div>
      ${nearMatches.length ? `
        <details class="near-match-details">
          <summary>Near Matches (${nearMatches.length})</summary>
          <div class="coverage-category-grid">
            ${renderCoverageCategory("Near Matches", nearMatches)}
          </div>
        </details>
      ` : ""}
      ${renderPartnerFirmReview(analysis.partners)}
      ${renderEscalationSummary(analysis)}
      ${renderEmergencyDecisionLog("coverage")}
    </section>
  `;
}

function renderEmergencyDecisionLog(context = "full") {
  const compact = context === "command" || context === "coverage";
  const entries = compact ? state.emergencyDecisionLog.slice(0, 2) : state.emergencyDecisionLog;
  return `
    <section class="decision-log ${compact ? "compact" : ""}">
      <div class="section-title">
        <div>
          <h2>${compact ? "Decision Log Preview" : "Decision Log"}</h2>
          <p>${compact ? "Short excerpt. Open the Decision Log page for the full local record." : "Local-only record of coverage, pickup, partner, and manager-override decisions made in this session."}</p>
        </div>
        <div class="panel-actions">
          <span class="badge info">${state.emergencyDecisionLog.length} Entries</span>
          ${compact ? `<button class="ghost-button" type="button" data-page="decisionlog">Open Decision Log</button>` : ""}
        </div>
      </div>
      ${entries.length ? `
        <div class="decision-log-list">
          ${entries.map(entry => {
            const summary = createDecisionSummary(entry);
            return `
            <article class="decision-log-entry">
              <div class="decision-log-head">
                <div>
                  <strong>${summary.headline}</strong>
                  <span class="subtle">${escapeHtml(entry.timestamp)} / ${escapeHtml(entry.role)} / ${escapeHtml(entry.emergencyWorkOrder)}</span>
                </div>
                <div class="panel-actions">
                  <span class="badge ${summary.tone}">${entry.id}</span>
                  ${renderCopyButton(summary.copyText, "Copy Decision Summary")}
                </div>
              </div>
              <p>${escapeHtml(summary.summary)}</p>
              ${entry.impactLanguage ? `<div class="impact-callout"><strong>Impact</strong><span>${escapeHtml(entry.impactLanguage)}</span></div>` : ""}
              <div class="before-after-mini">
                <span>Before: <strong>${escapeHtml(entry.beforeStatus || "Pending")}</strong></span>
                <span>After: <strong>${escapeHtml(entry.afterStatus || entry.statusAfterDecision)}</strong></span>
                <span>Decision Time: <strong>${escapeHtml(entry.timestamp)}</strong></span>
              </div>
              <details class="decision-source-details" ${!compact && state.opsViewMode === "expanded" ? "open" : ""}>
                <summary>Decision Source Details</summary>
                <div class="decision-log-grid">
                  <div><span>Assigned Technician</span><strong>${renderSafeText(entry.assignedTechnician || "None")}</strong></div>
                  <div><span>Replacement Technician</span><strong>${renderSafeText(entry.replacementTechnician || "None")}</strong></div>
                  <div><span>Partner Firm</span><strong>${renderSafeText(entry.partnerFirm || "None")}</strong></div>
                  <div><span>Required Certs / Access</span><strong>${renderSafeText(entry.required)}</strong></div>
                  <div><span>Jobs Affected</span><strong>${renderSafeList(entry.jobsAffected)}</strong></div>
                  <div><span>Equipment Affected</span><strong>${renderSafeList(entry.equipmentAffected)}</strong></div>
                  ${compact ? "" : `
                    <div><span>Issue</span><strong>${renderSafeText(entry.issue || "Emergency coverage request")}</strong></div>
                    <div><span>Recommended Action</span><strong>${renderSafeText(entry.recommendedAction || entry.decisionType)}</strong></div>
                    <div><span>Approved Action</span><strong>${renderSafeText(entry.approvedAction || entry.statusAfterDecision)}</strong></div>
                    <div><span>Readiness Checks Used</span><strong>${renderSafeList(entry.readinessChecksUsed, "Certs, access, equipment, coverage impact")}</strong></div>
                    <div><span>Cascading Impact</span><strong>${renderSafeText(entry.cascadingImpact || "Reviewed in coverage workflow")}</strong></div>
                    <div><span>Before / After</span><strong>${renderSafeText(entry.beforeStatus || "Pending")} to ${renderSafeText(entry.afterStatus || entry.statusAfterDecision)}</strong></div>
                    <div><span>Reason</span><strong>${renderSafeText(entry.reason)}</strong></div>
                    <div><span>Remaining Risks</span><strong>${renderSafeText(entry.remainingRisks)}</strong></div>
                    <div><span>Status After Decision</span><strong>${renderSafeText(entry.statusAfterDecision)}</strong></div>
                    <div><span>Notes</span><strong>${renderSafeText(entry.notes || "No notes entered.")}</strong></div>
                  `}
                </div>
                ${renderSourceDetails(summary, "Summary Source Details")}
              </details>
            </article>
          `;
          }).join("")}
        </div>
      ` : `<div class="empty-state">No emergency dispatch decisions logged yet. Use an emergency action button to create the first local entry.</div>`}
    </section>
  `;
}

function renderDecisionLogPage() {
  const total = state.emergencyDecisionLog.length;
  const coverageApproved = state.emergencyDecisionLog.filter(entry => /coverage|direct|assign/i.test(entry.decisionType)).length;
  const pickupFinalized = Object.keys(state.pickupAssignments).length;
  const partnerReviewed = state.emergencyDecisionLog.filter(entry => /outsource|partner/i.test(entry.decisionType)).length;
  const overrides = state.emergencyDecisionLog.filter(entry => /escalate|override/i.test(entry.decisionType)).length;
  const impactSnapshot = createOperationalImpactSnapshot();
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Decision Log</p>
          <h2>Today's Decision Summary</h2>
          <p>Local-only operational record for coverage decisions, readiness checks, cascading impact, and before/after status. This is not a disciplinary tracking tool.</p>
        </div>
        <div class="panel-actions">
          ${renderOpsViewToggle()}
          <button class="primary-button" type="button" data-open-coverage="TRD-104">Approve TRD-104 Coverage</button>
        </div>
      </div>
      <div class="grid four">
        <div class="activity-row"><strong>${total} Decisions Recorded</strong><span class="subtle">Current browser session</span></div>
        <div class="activity-row"><strong>${coverageApproved} Coverage Plan Approved</strong><span class="subtle">Direct or coverage-chain decisions</span></div>
        <div class="activity-row"><strong>${pickupFinalized} Pickup Plan Finalized</strong><span class="subtle">Cylinder pickup assignments</span></div>
        <div class="activity-row"><strong>${partnerReviewed} Partner Firm Reviewed</strong><span class="subtle">${overrides} Open Escalations</span></div>
      </div>
    </section>
    ${renderDecisionImpactPanel(impactSnapshot)}
    ${renderEmergencyDecisionLog("full")}
  `;
}

function renderCoverageCategory(category, items) {
  const tone = category === "Best Direct Match" ? "good" : category === "Best Match With Coverage Plan" ? "info" : category === "Backup With Risk" ? "warn" : "bad";
  return `
    <article class="coverage-category">
      <div class="coverage-category-head">
        <h3>${category}</h3>
        <span class="badge ${tone}">${items.length} reviewed</span>
      </div>
      <div class="status-list">
        ${items.length ? items.map(renderCoverageCandidate).join("") : `<div class="empty-state">No candidates in this category.</div>`}
      </div>
    </article>
  `;
}

function renderCoverageCandidate(item) {
  const current = item.candidate.currentAssignment;
  return `
    <div class="coverage-card ${toneForStatus(item.risk)}">
      <div class="coverage-card-top">
        <div>
          <strong>${item.candidate.name}</strong>
          <span class="subtle">${item.candidate.distance} min away / ${item.candidate.availability}</span>
        </div>
        <div class="pill-list">
          <span class="badge ${item.qualified ? "good" : "bad"}">${item.qualified ? `${item.score}% Match` : "Not Qualified"}</span>
          <span class="badge ${toneForStatus(item.risk)}">${item.risk} risk</span>
        </div>
      </div>
      <p>${item.reason}</p>
      <div class="coverage-detail-grid">
        <div><span>Certifications</span><strong>${item.candidate.certs.join(", ")}</strong></div>
        <div><span>Access</span><strong>${item.candidate.access.join(", ")}</strong></div>
        <div><span>Equipment</span><strong>${item.candidate.equipment.join(", ")}</strong></div>
      </div>
      ${current ? renderCurrentAssignmentImpact(item, current) : `<div class="coverage-note good"><strong>Current assignment</strong><span>Available without pulling coverage from another job.</span></div>`}
    </div>
  `;
}

function renderCurrentAssignmentImpact(item, current) {
  return `
    <div class="assignment-impact">
      <div class="assignment-impact-head">
        <strong>Current assignment: ${current.project}</strong>
        <span class="badge ${current.priority === "Critical" ? "bad" : "warn"}">${current.priority}</span>
      </div>
      <div class="coverage-detail-grid">
        <div><span>Service</span><strong>${current.service}</strong></div>
        <div><span>Required certs</span><strong>${current.requiredCerts.join(", ")}</strong></div>
        <div><span>Required equipment</span><strong>${current.requiredEquipment.join(", ")}</strong></div>
        <div><span>Movable</span><strong>${current.movable ? "Yes" : "No without coverage"}</strong></div>
        <div><span>Replacement</span><strong>${item.coverage?.replacement ? item.coverage.replacement.name : "No internal coverage found"}</strong></div>
        <div><span>Drive time</span><strong>${current.driveTimeImpact}</strong></div>
        <div><span>Overtime</span><strong>${current.overtimeImpact}</strong></div>
      </div>
      <div class="coverage-note ${item.coverage?.uncovered ? "bad" : "info"}">
        <strong>${item.coverage?.uncovered ? "Coverage gap" : "Coverage plan"}</strong>
        <span>${item.coverage?.steps.join(" ")}</span>
      </div>
      <div class="coverage-note warn">
        <strong>Client/project impact</strong>
        <span>${current.clientImpact}</span>
      </div>
    </div>
  `;
}

function renderOutsourceRecommendation(analysis) {
  const partner = analysis.bestPartner;
  if (!partner) {
    return `
      <article class="coverage-category outsource-card">
        <div class="coverage-category-head">
          <h3>Outsource Recommended</h3>
          <span class="badge bad">Escalate</span>
        </div>
        <div class="coverage-note bad">
          <strong>No approved internal or partner coverage found.</strong>
          <span>Escalate to Branch Manager.</span>
        </div>
      </article>
    `;
  }
  return `
    <article class="coverage-category outsource-card">
      <div class="coverage-category-head">
        <h3>Outsource Recommended</h3>
        <span class="badge info">Pilot partner firm</span>
      </div>
      <div class="partner-recommendation">
        <strong>${partner.partner.name}</strong>
        <span class="subtle">${partner.partner.status} vendor / ${partner.partner.rating}/5 preferred rating / ${partner.partner.typicalResponse}</span>
        <p>${partner.partner.name} matches concrete testing capability, regional coverage, active vendor status, and ${partner.partner.secureAccess.toLowerCase()} secure-site access.</p>
        <div class="coverage-detail-grid">
          <div><span>Contact</span><strong>${partner.partner.contact}</strong></div>
          <div><span>Phone</span><strong>${partner.partner.phone}</strong></div>
          <div><span>Email</span><strong>${partner.partner.email}</strong></div>
          <div><span>Services matched</span><strong>${partner.partner.services.filter(service => /concrete/i.test(service)).join(", ") || partner.partner.services[0]}</strong></div>
          <div><span>Certifications</span><strong>${partner.partner.certifications.join(", ")}</strong></div>
          <div><span>Risk</span><strong>${partner.responseOk ? "May miss 90-minute truck ETA; call immediately." : "Response time likely exceeds truck ETA."}</strong></div>
        </div>
        <div class="coverage-actions compact">
          <button class="ghost-button" type="button">Call Partner</button>
          <button class="ghost-button" type="button">Create Outsource Request</button>
        </div>
      </div>
    </article>
  `;
}

function renderPartnerFirmReview(partners) {
  return `
    <section class="partner-review">
      <div class="section-title">
        <div>
          <h2>Approved Partner Firm Review</h2>
          <p>Pilot partner firms reviewed only when internal coverage risks leaving critical work uncovered.</p>
        </div>
      </div>
      <div class="partner-grid">
        ${partners.map(item => `
          <article class="partner-card">
            <div class="coverage-card-top">
              <div>
                <strong>${item.partner.name}</strong>
                <span class="subtle">${item.partner.region}</span>
              </div>
              <span class="badge ${item.partner.status === "Active" ? "good" : "warn"}">${item.partner.status}</span>
            </div>
            <div class="partner-score"><span style="width:${Math.min(100, item.score)}%"></span></div>
            <div class="coverage-detail-grid">
              <div><span>Services</span><strong>${item.partner.services.join(", ")}</strong></div>
              <div><span>Certifications</span><strong>${item.partner.certifications.join(", ")}</strong></div>
              <div><span>Secure access</span><strong>${item.partner.secureAccess}</strong></div>
              <div><span>Response</span><strong>${item.partner.typicalResponse}</strong></div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderEscalationSummary(analysis) {
  const best = analysis.candidates[0];
  return `
    <section class="escalation-summary">
      <div class="section-title">
        <div>
          <h2>Escalation Summary</h2>
          <p>CMTCommand found one clean internal coverage option and one partner fallback. ${escapeHtml(best.candidate.name)} is recommended because ${escapeHtml(best.candidate.name)} meets certification, clearance, equipment, ETA, and pickup requirements without creating another Not Ready job.</p>
        </div>
      </div>
      <div class="escalation-grid">
        <div><strong>Recommended Action</strong><span>${escapeHtml(best.category)}: assign ${escapeHtml(best.candidate.name)} or approve the proposed coverage chain.</span></div>
        <div><strong>Cascading Impact</strong><span>${best.coverage?.uncovered ? "Coverage chain leaves a readiness gap that needs manager review." : "No new Not Ready job is created by the recommended option."}</span></div>
        <div><strong>Pickup Impact</strong><span>Concrete cylinder return is visible and should be finalized after the coverage plan is approved.</span></div>
        <div><strong>Decision Required</strong><span>Approve direct internal dispatch, approve coverage-chain reassignment, review partner firm, or escalate to Branch Manager.</span></div>
      </div>
    </section>
  `;
}

function renderTechnicianLocationPins(order) {
  if (!canViewFieldLocation()) return "";
  return technicians
    .filter(tech => locationVisibility(tech).visible)
    .slice(0, 10)
    .map(tech => {
      const visibility = locationVisibility(tech);
      const title = `${tech.name} - ${tech.fieldStatus} - ${visibility.label} - ${locationDistance(tech, order)} mi to selected work order`;
      return `<button class="map-pin tech ${visibility.tone}" title="${title}" style="left:${tech.location.x}%;top:${tech.location.y}%;">T</button>`;
    }).join("");
}

function renderFieldStatusPanel(order) {
  if (!canViewFieldLocation()) {
    return renderLocationRestrictedPanel();
  }
  const active = technicians.filter(tech => locationVisibility(tech).visible);
  const stale = technicians.filter(tech => locationVisibility(tech).label === "Stale").length;
  const hidden = technicians.length - active.length;
  const nearest = active
    .map(tech => ({ tech, visibility: locationVisibility(tech), distance: locationDistance(tech, order) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
  return `
    <section class="field-status-panel">
      <div class="panel-head compact">
        <div>
          <h2>Field Status & Dispatch Location</h2>
          <p>Operational visibility during scheduled work hours only. Built for dispatch efficiency, safety, ETA accuracy, emergency response, and fewer calls while technicians are driving or onsite.</p>
        </div>
      </div>
      <div class="field-status-summary">
        <div><strong>${active.length}</strong><span>visible during work hours</span></div>
        <div><strong>${stale}</strong><span>stale or poor signal</span></div>
        <div><strong>${hidden}</strong><span>not tracked now</span></div>
      </div>
      <div class="field-status-grid">
        ${nearest.map(({ tech, visibility, distance }) => `
          <article class="field-status-card">
            <div>
              <strong>${tech.name} - ${distance + 10} Min To ${order.id}</strong>
              <span class="subtle">Currently: ${tech.location.nearestProject} / ${tech.location.label}</span>
            </div>
            <div class="pill-list">
              <span class="badge ${toneForStatus(tech.fieldStatus)}">${tech.fieldStatus}</span>
              <span class="badge ${visibility.tone}">${visibility.label}</span>
            </div>
            <dl>
              <div><dt>Last updated</dt><dd>${tech.lastUpdatedMinutes} min ago</dd></div>
              <div><dt>Location Type</dt><dd>Work-Hours Dispatch Location</dd></div>
              <div><dt>Source</dt><dd>${tech.trackingSource}</dd></div>
            </dl>
          </article>
        `).join("")}
      </div>
      ${renderLocationPolicyPanel()}
      ${renderLocationAuditLog()}
    </section>
  `;
}

function renderLocationPolicyPanel() {
  return `
    <div class="location-policy">
      <strong>Privacy and safety rules</strong>
      <span>Company-issued phones or vehicles only during working hours. Personal phones require explicit opt-in. Off-duty, PTO, unavailable, and after-hours movement is never shown. This is not a disciplinary or movement-history tool.</span>
    </div>
  `;
}

function renderLocationRestrictedPanel() {
  return `
    <section class="field-status-panel restricted">
      <div class="panel-head compact">
        <div>
          <h2>Field Status & Dispatch Location</h2>
          <p>Location access is restricted to Dispatcher, Branch Manager, and Executive roles.</p>
        </div>
      </div>
      ${renderLocationPolicyPanel()}
    </section>
  `;
}

function renderLocationAuditLog() {
  const rows = state.locationViewLog.length ? state.locationViewLog : [{
    role: state.role,
    scope: "No location views logged yet",
    time: "Current session",
    purpose: "Location views appear here for accountability"
  }];
  return `
    <div class="location-audit">
      <strong>Location view log</strong>
      ${rows.map(row => `<span>${row.time} / ${row.role} viewed ${row.scope}. Purpose: ${row.purpose}.</span>`).join("")}
    </div>
  `;
}

function renderRoads() {
  return [
    [8, 14, 84, 10],
    [4, 72, 82, -18],
    [34, 5, 58, 62],
    [13, 39, 62, -4],
    [56, 11, 38, 36]
  ].map(r => `<span class="map-road" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;transform:rotate(${r[3]}deg);"></span>`).join("");
}

function rankTechnicians(order) {
  const ranked = technicians.map((tech, index) => {
    const qualified = certMatch(tech, order.requiredCerts);
    const availableBonus = tech.status === "Available" ? 18 : tech.status === "Assigned" ? 8 : tech.status === "Onsite" ? -6 : -12;
    const workloadPenalty = Math.round(tech.workload / 8);
    const distance = locationDistance(tech, order);
    const distanceScore = Math.max(0, 24 - distance);
    const equipmentBonus = order.requiredEquipment.some(eq => tech.equipment.includes(eq.split(" ")[0])) ? 8 : 0;
    const score = Math.max(20, Math.min(99, (qualified ? 42 : 8) + availableBonus + distanceScore + equipmentBonus + Math.round(tech.quality / 8) - workloadPenalty));
    let label = "Not qualified";
    if (qualified && score >= 82) label = "Best match";
    else if (qualified && score >= 68) label = "Good match";
    else if (qualified) label = "Backup option";
    return {
      tech,
      qualified,
      score,
      label,
      tone: !qualified ? "bad" : score >= 82 ? "good" : score >= 68 ? "warn" : "gray",
      reason: `${distance} mi away, ${tech.fieldStatus.toLowerCase()}, updated ${tech.lastUpdatedMinutes} min ago, ${tech.onTime}% on-time history`
    };
  }).sort((a, b) => b.score - a.score);
  const qualifiedOptions = ranked.filter(item => item.qualified).slice(0, 3);
  const notQualifiedOption = ranked.find(item => !item.qualified);
  return [...qualifiedOptions, notQualifiedOption].filter(Boolean);
}

function renderProjects() {
  return `
    <section class="grid four">
      ${projects.map(project => `
        <article class="mini-card">
          <span>${project.id} / ${project.sector}</span>
          <strong>${project.name}</strong>
          <div class="progress ${toneForScore(project.margin + 55)}"><span style="width:${Math.min(100, project.actualHours / project.budgetHours * 100)}%"></span></div>
          <span>${project.actualHours} of ${project.budgetHours} budgeted hours</span>
          <div class="pill-list">
            <span class="badge ${toneForStatus(project.status)}">${project.status}</span>
            <span class="badge ${toneForStatus(project.billing)}">${project.billing}</span>
          </div>
        </article>
      `).join("")}
    </section>
    ${renderTablePanel("Project Overview", "Tabs in this MVP are represented as project signals: work orders, dispatch, reports, lab samples, geotechnical records, documents, billing, notes, and activity.", "projectsTable", projects, [
      ["id", "Project #"],
      ["name", "Project"],
      ["client", "Client"],
      ["manager", "PM"],
      ["sector", "Type"],
      ["openOrders", "Open WOs"],
      ["margin", "Margin"],
      ["billing", "Billing"]
    ])}
  `;
}

function renderWorkOrders() {
  return `
    <section class="split">
      ${renderTablePanel("Work Order Board", "Daily field assignments with required certifications, equipment, report due dates, and billing codes.", "workOrdersTable", workOrders, [
        ["id", "WO"],
        ["project", "Project"],
        ["service", "Service"],
        ["requiredTime", "Required"],
        ["technician", "Technician"],
        ["priority", "Priority"],
        ["status", "Status"],
        ["billingCode", "Billing"]
      ])}
      <div class="mobile-panel">
        <div class="mobile-frame">
          <div class="mobile-header">
            <div>
              <strong>Technician Field Form</strong>
              <p class="subtle" style="margin:3px 0 0;">Mobile-first work order update</p>
            </div>
            <span class="badge info">WO-2435</span>
          </div>
          <div class="activity-row">
            <strong>Concrete testing</strong>
            <span class="subtle">Potomac Yard Mixed Use / Level 3 deck pour</span>
          </div>
          <form class="form-grid">
            <label>Arrival status
              <select><option>Onsite</option><option>Testing</option><option>Awaiting pickup</option><option>Problem / delayed</option></select>
            </label>
            <label>Slump
              <input value="4.25 in">
            </label>
            <label>Air
              <input value="5.8%">
            </label>
            <label>Temperature
              <input value="71 F">
            </label>
            <label>Field notes
              <textarea rows="4">Truck 42 sampled at discharge. Cylinders tagged and curing box verified.</textarea>
            </label>
            <button class="primary-button" type="button">Save field update</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderTechnicians() {
  const serviceTypes = Object.keys(serviceTypeRequirements);
  const rows = demoTechnicians.map(tech => {
    const availableTomorrow = tech.status === "Available";
    const serviceReady = serviceTypes.filter(service => {
      const req = getServiceRequirements(service);
      const certMatch = req.requiredCerts.every(cert => getDemoCert(tech, cert));
      const clearanceMatch = req.clearance.every(clearance => tech.clearances?.includes(clearance));
      return certMatch && clearanceMatch && availableTomorrow;
    });
    const expiring = tech.certs.filter(cert => cert.expiresIn <= 30);
    const current = demoWorkOrders.find(order => getDemoAssignedTech(order)?.id === tech.id);
    const riskNotes = [
      availableTomorrow ? "" : `Not available: ${tech.status}`,
      expiring[0] ? `${expiring[0].name} expires in ${expiring[0].expiresIn} days` : "",
      current ? `Assigned to ${current.id}` : "No job currently assigned"
    ].filter(Boolean);
    return { tech, availableTomorrow, serviceReady, expiring, current, riskNotes };
  });
  const qualifiedNow = rows.filter(row => row.serviceReady.length).length;
  const atRisk = rows.filter(row => row.expiring.length || !row.availableTomorrow).length;
  return `
    <section class="workforce-hero panel">
      <div>
        <p class="eyebrow">People Readiness</p>
        <h2>Who can be dispatched for tomorrow's work?</h2>
        <p>Operational view of availability, certifications, clearance, and service-ready coverage. This is not HR performance management.</p>
      </div>
      <span class="badge info">Rules-based readiness checks</span>
    </section>
    <section class="grid four">
      <article class="metric-card good"><span class="metric-label">Dispatchable</span><strong>${rows.filter(row => row.availableTomorrow).length}</strong><span class="metric-hint">Available tomorrow</span></article>
      <article class="metric-card info"><span class="metric-label">Service-ready</span><strong>${qualifiedNow}</strong><span class="metric-hint">Qualified and cleared for at least one service</span></article>
      <article class="metric-card warn"><span class="metric-label">Needs renewal</span><strong>${rows.reduce((sum, row) => sum + row.expiring.length, 0)}</strong><span class="metric-hint">Certs expiring within 30 days</span></article>
      <article class="metric-card bad"><span class="metric-label">Coverage risk</span><strong>${atRisk}</strong><span class="metric-hint">Not available or credential risk</span></article>
    </section>
    <section class="table-panel">
      <div class="table-head">
        <div>
          <h2>People Readiness</h2>
          <p>Dispatchable, qualified, cleared, available, and service-ready coverage for tomorrow.</p>
        </div>
        <button class="primary-button" type="button" data-open-coverage="TRD-104">Find Coverage for TRD-104</button>
      </div>
      <div class="data-table-wrap no-desktop-scroll">
        <table class="workforce-table compact">
          <thead>
            <tr>
              <th>Technician</th>
              <th>Tomorrow Status</th>
              <th>Service-Ready For</th>
              <th>Certs</th>
              <th>Clearance</th>
              <th>Current Assignment</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td><strong>${row.tech.name}</strong><br><span class="subtle">${row.tech.branch}</span></td>
                <td><span class="badge ${row.availableTomorrow ? "good" : "bad"}">${row.availableTomorrow ? "Dispatchable" : "Not Available"}</span></td>
                <td><div class="pill-list">${row.serviceReady.length ? row.serviceReady.slice(0, 3).map(service => `<span class="badge good">${getServiceDisplayName(service)}</span>`).join("") : `<span class="badge bad">Coverage Risk</span>`}</div></td>
                <td><details class="readiness-gap-details"><summary>${row.tech.certs.length} Certs - View</summary><div class="pill-list">${row.tech.certs.map(cert => `<span class="badge ${cert.expiresIn <= 30 ? "warn" : "info"}">${cert.name}${cert.expiresIn <= 30 ? ` - ${cert.expiresIn}d` : ""}</span>`).join("")}</div></details></td>
                <td><div class="pill-list">${(row.tech.clearances || []).map(clearance => `<span class="badge purple">${clearance}</span>`).join("") || `<span class="badge warn">Needs clearance</span>`}</div></td>
                <td>${row.current ? `${row.current.id} / ${row.current.project}` : "Open"}</td>
                <td><details class="readiness-gap-details"><summary>${row.riskNotes.length} Notes - View</summary><div class="status-list">${row.riskNotes.map(note => `<span class="demo-reason">${note}</span>`).join("")}</div></details></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Service-Type Requirements</h2>
          <p>Lightweight static rules used by Tomorrow Readiness, Find Coverage, People Readiness, Equipment Readiness, and Pilot Setup hints.</p>
        </div>
      </div>
      <div class="cross-module-grid">
        ${Object.entries(serviceTypeRequirements).map(([service, req]) => `
          <article class="cross-module-card">
            <span class="badge info">${service}</span>
            <strong>${req.requiredCerts.join(", ")}</strong>
            <p>Equipment: ${req.requiredEquipment.join(", ")}. Clearance: ${req.clearance.join(", ")}.</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWorkforceQualifications() {
  const metrics = getWorkforceMetrics();
  const selected = workforceEmployees.find(employee => employee.id === state.selectedWorkforceEmployee) || workforceEmployees[0];
  const selectedProgress = employeeQualificationProgress(selected);
  return `
    <section class="workforce-hero panel">
      <div>
        <p class="eyebrow">Workforce Qualification & Succession Planning</p>
        <h2>Workforce Qualification & Career Path Center</h2>
        <p>Track qualifications, certification risk, promotion readiness, and bid staffing impact without turning CMTCommand into HR, payroll, LMS, or recruiting software.</p>
      </div>
      <span class="badge info">Operational readiness module</span>
    </section>
    ${renderWorkforceSnapshot(metrics)}
    ${renderWorkforceCriticalActions()}
    <section class="workforce-grid">
      ${renderEmployeeQualificationMatrix()}
      ${renderEmployeeQualificationDetail(selected, selectedProgress)}
    </section>
    ${renderBidQualificationGaps()}
    ${renderCertificationExpirationMonitor()}
    ${renderCareerPathMap()}
    ${renderRoleRequirementPanel()}
    ${renderTrainingPriorities()}
  `;
}

function renderWorkforceSnapshot(metrics) {
  const cards = [
    ["Total employees", metrics.total, "info", "Active pilot roster"],
    ["Ready", metrics.fullyQualified, "good", "Fully qualified for next-role requirements"],
    ["Expiring Soon", metrics.exp30 + metrics.exp60 + metrics.exp90, "warn", `${metrics.exp30}/${metrics.exp60}/${metrics.exp90} in 30/60/90 days`],
    ["Promotion Ready", metrics.promotionReady, "good", "Ready for manager review"],
    ["Critical gaps", metrics.criticalGaps, "bad", "Open project qualification gaps"],
    ["Bid Risk", metrics.staffingRisks, "warn", "Projects not fully covered"]
  ];
  return `
    <section class="workforce-section">
      <div class="section-title">
        <div>
          <h2>Workforce Snapshot</h2>
          <p>Who is qualified, who is at risk, and where staffing gaps threaten work.</p>
        </div>
      </div>
      <div class="workforce-snapshot-grid">
        ${cards.map(([label, value, tone, hint]) => `
          <article class="workforce-snapshot-card ${tone}">
            <span>${label}</span>
            <strong>${value}</strong>
            <p>${hint}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWorkforceCriticalActions() {
  const actions = getWorkforceCriticalActions();
  return `
    <section class="panel workforce-actions-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Critical Actions</p>
          <h2>What management should do next</h2>
          <p>Shortlist of the highest-impact training, renewal, promotion, and bid-risk decisions.</p>
        </div>
        <span class="badge bad">${actions.filter(action => action.tone === "bad").length} urgent</span>
      </div>
      <div class="workforce-action-grid">
        ${actions.map((action, index) => `
          <article class="workforce-action-card ${action.tone}">
            <span class="badge ${action.tone}">${escapeHtml(action.label)}</span>
            <strong>${escapeHtml(action.title)}</strong>
            <p>${escapeHtml(action.detail)}</p>
            <small>Action ${index + 1}</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderEmployeeQualificationMatrix() {
  return `
    <section class="table-panel workforce-matrix">
      <div class="table-head">
        <div>
          <h2>Employee Qualification Matrix</h2>
          <p>Qualifications, next-role progress, missing requirements, and readiness status.</p>
        </div>
        <span class="badge info">${workforceEmployees.length} employees</span>
      </div>
      <div class="data-table-wrap">
        <table class="workforce-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Office</th>
              <th>Key Certs</th>
              <th>Expiring Soon</th>
              <th>Next Role</th>
              <th>Progress</th>
              <th>Need</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${workforceEmployees.map(employee => {
              const progress = employeeQualificationProgress(employee);
              const expiring = progress.expiring.filter(record => record.daysRemaining <= 90);
              return `
                <tr class="${employee.id === state.selectedWorkforceEmployee ? "selected-row" : ""}">
                  <td><button class="link-button" type="button" data-workforce-employee="${employee.id}">${employee.name}</button></td>
                  <td>${employee.currentRole}</td>
                  <td>${employee.office}</td>
                  <td><div class="pill-list">${employee.certifications.slice(0, 2).map(([cert]) => `<span class="badge info">${cert}</span>`).join("")}<span class="badge neutral">+${Math.max(0, employee.certifications.length - 2)}</span></div></td>
                  <td>${expiring.length ? expiring.map(record => `<span class="badge ${certificationUrgency(record.daysRemaining).tone}">${record.certification}: ${record.daysRemaining}d</span>`).join(" ") : `<span class="badge good">None</span>`}</td>
                  <td>${employee.nextRole}</td>
                  <td>${renderProgressBar(progress.progress, progress.tone)}</td>
                  <td>${progress.missing[0] ? `<span class="demo-reason">${progress.missing[0]}</span>` : `<span class="badge good">Complete</span>`}</td>
                  <td><span class="badge ${progress.tone}">${progress.status}</span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProgressBar(value, tone = "info") {
  return `
    <div class="workforce-progress">
      <span class="progress ${tone}"><span style="width:${Math.max(4, Math.min(100, value))}%"></span></span>
      <strong>${value}%</strong>
    </div>
  `;
}

function renderEmployeeQualificationDetail(employee, progress) {
  const certRecords = getWorkforceCertificationRecords(employee);
  const missingCertification = progress.missing.find(item => item.includes("Certification") || item.includes("WACEL") || item.includes("ICC") || item.includes("ACI") || item.includes("NICET") || item.includes("OSHA"));
  const urgentCerts = certRecords.filter(record => record.daysRemaining <= 90);
  return `
    <aside class="panel workforce-detail">
      <div class="workforce-detail-hero">
        <div>
          <p class="eyebrow">Employee Detail Panel</p>
          <h2>${employee.name}</h2>
          <p>${employee.currentRole} / ${employee.department} / ${employee.office}</p>
        </div>
        <span class="badge ${progress.tone}">${progress.status}</span>
      </div>
      <div class="workforce-progress-card">
        <div class="demo-candidate-head">
          <strong>${employee.nextRole}</strong>
          <span>${progress.progress}% ready</span>
        </div>
        ${renderProgressBar(progress.progress, progress.tone)}
        <p>${employee.careerPath} / ${employee.experienceMonths} months experience / performance ${employee.performance}</p>
      </div>
      <div class="selected-order workforce-detail-stats">
        <dl>
          <div><dt>Certs held</dt><dd>${employee.certifications.length}</dd></div>
          <div><dt>Expiring</dt><dd>${urgentCerts.length}</dd></div>
          <div><dt>Completed</dt><dd>${progress.completed.length}</dd></div>
          <div><dt>Missing</dt><dd>${progress.missing.length}</dd></div>
        </dl>
      </div>
      <div class="workforce-detail-section">
        <h3>Certification Risk</h3>
        ${(urgentCerts.length ? urgentCerts : certRecords.slice(0, 3)).map(record => `<div class="activity-row"><strong>${record.certification}</strong><span class="subtle">Expires ${record.expiration} / ${record.daysRemaining} days remaining</span><span class="badge ${certificationUrgency(record.daysRemaining).tone}">${certificationUrgency(record.daysRemaining).group}</span></div>`).join("")}
      </div>
      <div class="grid two detail-mini-grid">
        <div>
          <h3>Completed Requirements</h3>
          <div class="status-list">${progress.completed.map(item => `<div class="alert-row"><span class="dot good"></span><span>${item}</span></div>`).join("") || `<div class="empty-state">No completed target-role requirements yet.</div>`}</div>
        </div>
        <div>
          <h3>Missing Requirements</h3>
          <div class="status-list">${progress.missing.map(item => `<div class="alert-row"><span class="dot warn"></span><span>${item}</span></div>`).join("") || `<div class="empty-state">No missing target-role requirements.</div>`}</div>
        </div>
      </div>
      <div class="workforce-impact-card">
        <strong>Recommended next action</strong>
        <p>${missingCertification ? `Schedule ${missingCertification} within 60 days.` : progress.missing[0] ? `Address ${progress.missing[0]} and assign a mentor owner.` : "Maintain renewal dates and assign mentoring responsibility."}</p>
        <strong>Business impact</strong>
        <p>${employee.businessImpact}</p>
      </div>
    </aside>
  `;
}

function renderCareerPathMap() {
  const promotionRows = workforceEmployees
    .map(employee => ({ employee, progress: employeeQualificationProgress(employee) }))
    .sort((a, b) => b.progress.progress - a.progress.progress)
    .slice(0, 4);
  return `
    <section class="panel career-path-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Career Path / Promotion Readiness</p>
          <h2>Retention and succession planning</h2>
          <p>Career progress tied to the qualifications the business needs next.</p>
        </div>
      </div>
      <div class="promotion-readiness-strip">
        ${promotionRows.map(item => `
          <div>
            <strong>${item.employee.name}</strong>
            <span>${item.employee.nextRole}</span>
            ${renderProgressBar(item.progress.progress, item.progress.tone)}
          </div>
        `).join("")}
      </div>
      <div class="career-path-grid">
        ${careerPaths.map(([path, roles]) => `
          <article class="career-path-card">
            <strong>${path}</strong>
            <div class="career-role-chain">${roles.map(role => `<span>${role}</span>`).join("")}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderRoleRequirementPanel() {
  return `
    <section class="panel role-requirement-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Requirement / Role Builder Preview</p>
          <h2>Role requirements and business capabilities</h2>
          <p>Readable v1 requirement structures only. No full admin UI yet.</p>
        </div>
      </div>
      <div class="role-requirement-grid">
        ${Object.entries(workforceRoleRequirements).map(([role, req]) => `
          <article class="role-requirement-card">
            <div class="demo-candidate-head">
              <strong>${role}</strong>
              <span class="badge info">${req.path}</span>
            </div>
            <div><span>Required certifications</span><p>${req.requiredCertifications.join(", ") || "None"}</p></div>
            <div><span>Experience</span><p>${req.requiredExperienceMonths} months / performance ${req.requiredPerformance}+</p></div>
            <div><span>Training</span><p>${req.requiredTraining.join(", ") || "None"}</p></div>
            <div><span>Leadership</span><p>${req.requiredLeadership.join(", ") || "None"}</p></div>
            <div><span>Business capabilities unlocked</span><p>${req.capabilities.join(", ")}</p></div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCertificationExpirationMonitor() {
  const groups = getWorkforceCertificationMonitor();
  return `
    <section class="panel expiration-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Certification Expiration Monitor</p>
          <h2>Renewal urgency by qualification</h2>
          <p>Expired and upcoming renewals tied to staffing and bid readiness impact.</p>
        </div>
      </div>
      <div class="expiration-grid">
        ${groups.map(group => `
          <article class="expiration-column">
            <h3>${group.group}</h3>
            ${group.records.slice(0, 6).map(record => `
              <div class="activity-row">
                <strong>${record.employee}</strong>
                <span class="subtle">${record.certification} / ${record.expiration} / ${record.daysRemaining} days</span>
                <span class="badge ${record.urgency.tone}">${record.urgency.group}</span>
                <span class="subtle">${record.impact}</span>
              </div>
            `).join("") || `<div class="empty-state">No certifications in this group.</div>`}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBidQualificationGaps() {
  const projects = bidQualificationRequirements.map(getProjectQualificationMatches);
  return `
    <section class="panel bid-gap-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Project/Bid Qualification Gaps</p>
          <h2>Can we staff the work we want to win?</h2>
          <p>Shows staffing risk before bid commitments or tomorrow work planning create coverage surprises.</p>
        </div>
      </div>
      <div class="bid-gap-grid">
        ${projects.map(project => `
          <article class="bid-gap-card ${project.computedStatus === "Ready" ? "ready" : project.computedStatus === "At Risk" ? "risk" : "blocked"}">
            <div class="bid-gap-head">
              <div>
                <strong>${project.project}</strong>
                <span>${project.gaps.filter(gap => gap.gap > 0).length || "No"} shortage${project.gaps.filter(gap => gap.gap > 0).length === 1 ? "" : "s"}</span>
              </div>
              <span class="badge ${project.computedStatus === "Ready" ? "good" : project.computedStatus === "At Risk" ? "warn" : "bad"}">${project.computedStatus}</span>
            </div>
            <div class="bid-gap-requirements">
              ${project.gaps.map(gap => `
                <div class="${gap.gap ? "gap" : "covered"}">
                  <span>${gap.certification}</span>
                  <strong>${gap.available}/${gap.needed}</strong>
                  <em>${gap.gap ? `${gap.gap} short` : "covered"}</em>
                </div>
              `).join("")}
            </div>
            <p>${project.recommendation}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTrainingPriorities() {
  const priorities = getTrainingPriorities();
  return `
    <section class="panel training-priority-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Management Training Actions</p>
          <h2>Next best training investments</h2>
          <p>Priorities consider expiring certifications, project gaps, promotion readiness, high-value work, and staffing shortages.</p>
        </div>
      </div>
      <div class="training-priority-list">
        ${priorities.map((priority, index) => `
          <article class="training-priority-card">
            <span class="badge ${index < 2 ? "bad" : index < 5 ? "warn" : "info"}">Priority ${index + 1}</span>
            <strong>${escapeHtml(priority.action)}</strong>
            <div class="status-list">${priority.reason.map(reason => `<div class="alert-row"><span class="dot ${index < 2 ? "bad" : "info"}"></span><span>${escapeHtml(reason)}</span></div>`).join("")}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTechnicianLocationPanel(tech) {
  if (!canViewFieldLocation()) {
    return renderLocationRestrictedPanel();
  }
  const visibility = locationVisibility(tech);
  if (!visibility.visible) {
    return `
      <section class="panel technician-location-panel">
        <div class="panel-head compact">
          <div>
            <h2>Field Status & Dispatch Location</h2>
            <p>Operational visibility is hidden when a technician is off duty, on PTO, unavailable, or outside scheduled work hours.</p>
          </div>
          <span class="badge ${visibility.tone}">${visibility.label}</span>
        </div>
        <div class="location-policy">
          <strong>${tech.name} is not being tracked now</strong>
          <span>${visibility.reason} No after-hours movement history is shown or stored in this MVP.</span>
        </div>
        ${renderLocationAuditLog()}
      </section>
    `;
  }
  const nearestUrgent = workOrders
    .filter(order => order.priority === "Urgent" || !order.techId)
    .map(order => ({ order, distance: locationDistance(tech, order) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return `
    <section class="panel technician-location-panel">
      <div class="panel-head compact">
        <div>
          <h2>Field Status & Dispatch Location</h2>
          <p>Current work-hour dispatch context for ETA accuracy, safety, and reducing calls or texts while driving or onsite.</p>
        </div>
        <span class="badge ${visibility.tone}">${visibility.label}</span>
      </div>
      <div class="technician-location-grid">
        <div class="location-map-mini">
          <span class="map-pin tech ${visibility.tone}" style="left:${tech.location.x}%;top:${tech.location.y}%;">T</span>
        </div>
        <div class="status-list">
          <div class="activity-row">
            <strong>${tech.fieldStatus}</strong>
            <span class="subtle">${tech.location.label} / nearest assignment: ${tech.location.nearestProject}</span>
          </div>
          <div class="activity-row">
            <strong>Last updated ${tech.lastUpdatedMinutes} min ago</strong>
            <span class="subtle">${tech.trackingSource}${tech.trackingSource.includes("Personal") ? " / explicit opt-in consent on file" : ""}</span>
          </div>
          <div class="activity-row">
            <strong>${nearestUrgent.distance} mi to nearest urgent or unassigned work order</strong>
            <span class="subtle">${nearestUrgent.order.id} / ${nearestUrgent.order.service}</span>
          </div>
        </div>
      </div>
      ${renderLocationPolicyPanel()}
      ${renderLocationAuditLog()}
    </section>
  `;
}

function renderCertifications() {
  return `
    <section class="grid four">
      ${[
        ["Active", certifications.filter(c => c.status === "Active").length, "good"],
        ["Expiring soon", certifications.filter(c => c.status === "Expiring soon").length, "warn"],
        ["Expired", certifications.filter(c => c.status === "Expired").length, "bad"],
        ["Manual verification", certifications.length, "info"]
      ].map(renderMetric).join("")}
    </section>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Verification Workflow</h2>
          <p>Manual entry, certificate upload staging, and verification URL field. Official ACI, WACEL, ICC, and DOT integrations are future work and should require permission.</p>
        </div>
      </div>
      <div class="kpi-strip">
        <div class="activity-row"><strong>1. Enter record</strong><span class="subtle">Technician, type, number, issuer, dates</span></div>
        <div class="activity-row"><strong>2. Upload certificate</strong><span class="subtle">Stored document staging for MVP</span></div>
        <div class="activity-row"><strong>3. Add verification URL</strong><span class="subtle">Manual source, no scraping</span></div>
        <div class="activity-row"><strong>4. Alert dispatch</strong><span class="subtle">Missing or expired credentials block assignments</span></div>
      </div>
    </section>
    ${renderTablePanel("Certification Tracking", "Expiration alerts at 90, 60, 30 days, expired, and missing certification for assigned work.", "certTable", certifications, [
      ["technician", "Technician"],
      ["type", "Certification"],
      ["number", "Number"],
      ["issuer", "Issuer"],
      ["expiration", "Expires"],
      ["status", "Status"],
      ["verificationUrl", "Verification"]
    ])}
  `;
}

function renderEquipment() {
  const rows = demoEquipment.map(item => {
    const supports = Object.entries(serviceTypeRequirements)
      .filter(([, req]) => req.requiredEquipment.includes(item.category))
      .map(([service]) => service);
    const assignedOrder = demoWorkOrders.find(order => order.requiredEquipment.includes(item.category));
    const calibrationTone = item.calibrationDays < 0 ? "bad" : item.calibrationDays <= 30 ? "warn" : "good";
    const availableTomorrow = !["Out of service", "Unavailable"].includes(item.status) && item.calibrationDays >= 0;
    const riskNotes = [
      item.calibrationDays < 0 ? `Calibration expired ${Math.abs(item.calibrationDays)} days ago` : "",
      item.calibrationDays >= 0 && item.calibrationDays <= 30 ? `Calibration expires in ${item.calibrationDays} days` : "",
      item.status === "Limited/shared" ? "Limited/shared equipment window" : "",
      availableTomorrow ? "" : "Not available tomorrow"
    ].filter(Boolean);
    return { item, supports, assignedOrder, calibrationTone, availableTomorrow, riskNotes };
  }).sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.id.localeCompare(b.item.id) || a.item.calibrationDays - b.item.calibrationDays);
  return `
    <section class="grid four">
      ${[
        ["Equipment items", rows.length, "info"],
        ["Available tomorrow", rows.filter(row => row.availableTomorrow).length, "good"],
        ["Calibration warnings", rows.filter(row => row.item.calibrationDays <= 30 && row.item.calibrationDays >= 0).length, "warn"],
        ["Equipment Gaps", rows.filter(row => !row.availableTomorrow).length, "bad"]
      ].map(renderMetric).join("")}
    </section>
    <section class="table-panel">
      <div class="table-head">
        <div>
          <h2>Equipment Readiness</h2>
          <p>Tomorrow dispatch risks by equipment type, calibration status, assignment, service support, and availability.</p>
        </div>
        <button class="primary-button" type="button" data-open-coverage="TRD-104">Find Coverage for TRD-104</button>
      </div>
      <div class="data-table-wrap no-desktop-scroll">
        <table class="readiness-work-table compact">
          <thead>
            <tr>
              <th>Equipment Type</th>
              <th>Equipment ID</th>
              <th>Calibration Status</th>
              <th>Available Tomorrow</th>
              <th>Assigned Job / Tech</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${row.item.category}</td>
                <td><strong>${row.item.id}</strong><br><span class="subtle">${row.item.name}</span></td>
                <td><span class="badge ${row.calibrationTone}">${row.item.calibrationDays < 0 ? "Calibration Expired" : row.item.calibrationDays <= 30 ? "Calibration Warning" : "Calibration Valid"}</span></td>
                <td><span class="badge ${row.availableTomorrow ? "good" : "bad"}">${row.availableTomorrow ? "Yes" : "No"}</span></td>
                <td>${row.assignedOrder ? `${row.assignedOrder.id} / ${row.assignedOrder.project}` : "Pool"}<br><span class="subtle">${row.assignedOrder ? getDemoAssignedTech(row.assignedOrder)?.name || "Unassigned" : "Unassigned"}</span></td>
                <td>
                  <details class="readiness-gap-details">
                    <summary>${row.riskNotes.length ? `${row.riskNotes.length} Notes - View` : "Ready - View Notes"}</summary>
                    <div class="readiness-gap-detail-grid">
                      <div><span>Manufacturer</span><strong>${row.item.manufacturer || row.item.name.split(" ")[0]}</strong></div>
                      <div><span>Location</span><strong>${row.item.location}</strong></div>
                      <div><span>Serial Number</span><strong>${row.item.serial || row.item.id}</strong></div>
                      <div><span>Calibration Window</span><strong>${row.item.calibrationDays < 0 ? `Expired ${Math.abs(row.item.calibrationDays)} Days Ago` : `Valid For ${row.item.calibrationDays} Days`}</strong></div>
                      <div class="wide"><span>Service Support</span><strong>${row.supports.map(getServiceDisplayName).join(", ") || "Support Item"}</strong></div>
                      <div class="wide"><span>Readiness Notes</span><strong>${row.riskNotes.join("; ") || "Ready For Tomorrow"}</strong></div>
                    </div>
                  </details>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderLaboratory() {
  return `
    <section class="grid four">
      ${[
        ["Samples received today", 18, "info"],
        ["7-day breaks due", concreteSets.filter(s => s.breaksDue === "Today").length, "warn"],
        ["Overdue breaks", concreteSets.filter(s => s.breaksDue === "Overdue").length, "bad"],
        ["Lab capacity", "86%", "warn"]
      ].map(renderMetric).join("")}
    </section>
    <section class="grid two">
      ${renderTablePanel("Concrete Sample Tracking", "Flags patterns for review without assigning blame for low breaks.", "concreteTable", concreteSets, [
        ["id", "Set"],
        ["project", "Project"],
        ["technician", "Made by"],
        ["cast", "Date cast"],
        ["mix", "Mix ID"],
        ["cylinders", "Cylinders"],
        ["breaksDue", "Breaks"],
        ["report", "Report"]
      ])}
      ${renderTablePanel("Soils Lab Tracking", "Proctors, Atterberg limits, sieves, CBR, moisture, and classification work.", "soilTable", soilTests, [
        ["id", "Test"],
        ["project", "Project"],
        ["test", "Lab test"],
        ["status", "Status"],
        ["due", "Due"]
      ])}
    </section>
  `;
}

function renderGeotechnical() {
  return `
    <section class="grid four">
      ${[
        ["Active drilling projects", 4, "info"],
        ["Drill crews scheduled", 3, "good"],
        ["Boring logs pending", borings.filter(b => b.status === "Pending review").length, "warn"],
        ["Historical nearby projects", 27, "neutral"]
      ].map(renderMetric).join("")}
    </section>
    ${renderTablePanel("Boring Log Management", "Drill crew scheduling, samples, SPT data, groundwater observations, strata, and report status.", "boringTable", borings, [
      ["id", "Boring"],
      ["project", "Project"],
      ["driller", "Driller"],
      ["rig", "Rig"],
      ["depth", "Depth"],
      ["groundwater", "Groundwater"],
      ["status", "Status"]
    ])}
  `;
}

function renderReports() {
  return `
    <section class="grid three">
      ${[
        ["Awaiting review", reports.length, "warn"],
        ["Needs correction", reports.filter(r => r.status === "Needs correction").length, "bad"],
        ["Rules-based checks", 12, "info"]
      ].map(renderMetric).join("")}
    </section>
    ${renderTablePanel("Reports and QA/QC Review", "Rules-based checks for missing fields, expired certifications, calibration gaps, wrong references, out-of-range values, signatures, and late reports.", "reportsTable", reports, [
      ["id", "Report"],
      ["project", "Project"],
      ["type", "Type"],
      ["author", "Author"],
      ["status", "Status"],
      ["checks", "Audit signal"],
      ["health", "Health"]
    ])}
  `;
}

function renderBilling() {
  const revenue = projects.reduce((sum, p) => sum + p.contract, 0);
  const cost = Math.round(revenue * 0.69);
  const margin = Math.round((revenue - cost) / revenue * 100);
  const rows = projects.map(p => ({
    project: p.name,
    revenue: money(p.contract),
    cost: money(Math.round(p.contract * (1 - p.margin / 100))),
    margin: `${p.margin}%`,
    hours: `${p.actualHours} / ${p.budgetHours}`,
    billing: p.billing
  }));
  return `
    <section class="grid four">
      ${[
        ["Estimated revenue", money(revenue), "good"],
        ["Estimated cost", money(cost), "neutral"],
        ["Gross margin", `${margin}%`, "good"],
        ["Unbilled work orders", 11, "warn"]
      ].map(renderMetric).join("")}
    </section>
    ${renderTablePanel("Project Profitability", "Manager and executive-only financial view for revenue, cost, margin, hours, unbilled work, and billing errors.", "billingTable", rows, [
      ["project", "Project"],
      ["revenue", "Revenue"],
      ["cost", "Cost"],
      ["margin", "Margin"],
      ["hours", "Budget vs actual hours"],
      ["billing", "Billing"]
    ])}
  `;
}

function csvEscape(value) {
  return getPilotIntakeSafety().csvEscape(value);
}

function rowsToCsv(rows, columns) {
  return getPilotIntakeSafety().rowsToCsv(rows, columns);
}

function parseCsv(text) {
  return getPilotIntakeSafety().parseCsv(text);
}

function validateImport(entity, parseResultOrRows) {
  const config = intakeEntityConfig[entity];
  return getPilotIntakeSafety().validateImport(config, parseResultOrRows);
}

function makeTemplateRows(entity) {
  const config = intakeEntityConfig[entity];
  const sample = Object.fromEntries(config.requiredColumns.map(column => [column, `Sample ${column.replaceAll("_", " ")}`]));
  if (entity === "technicians") {
    return [{ name: "Taylor Grant", role: "CMT Technician II", branch: "Northern Virginia", status: "Available", certifications: "Level 2 Concrete; Secure Site Access", clearance: "Secure Site Access", phone: "(703) 555-0212", email: "taylor.grant@example.test" }];
  }
  if (entity === "partners") {
    return [{ firm_name: "Sample Field Testing Partner", services: "Concrete testing; Soil compaction", certifications: "ACI Field; WACEL Concrete", clearance_capability: "Limited", region: "DC / Northern Virginia", response_time: "2 hours", status: "Active", preferred_rating: "4.3" }];
  }
  return [sample];
}

function renderDataIntake() {
  return `
    <section class="panel data-intake-hero">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Pilot Setup / Data Intake</p>
          <h2>How would we get our data into CMTCommand?</h2>
          <p>For a 90-day pilot, upload an anonymized technician roster, certification list, equipment list, and one week of work orders. CMTCommand will identify tomorrow-readiness risks.</p>
        </div>
        <span class="badge info">Local-only pilot prep</span>
      </div>
      <div class="kpi-strip">
        <div class="activity-row"><strong>Technician roster</strong><span class="subtle">Names, roles, availability, branch</span></div>
        <div class="activity-row"><strong>Certification list</strong><span class="subtle">ACI, WACEL, ICC, nuclear gauge safety</span></div>
        <div class="activity-row"><strong>Equipment list</strong><span class="subtle">Calibration and availability</span></div>
        <div class="activity-row"><strong>Work orders / schedule</strong><span class="subtle">One week of anonymized work</span></div>
      </div>
      <div class="coverage-note good">
        <strong>Accepted pilot files</strong>
        <span>Technician roster, certification list, equipment list, work orders / schedule, optional site clearance list, optional partner firm list.</span>
      </div>
      <div class="warning-list">
        ${["Anonymized pilot data mode", "Required column validation", "Duplicate detection", "Import history", "Missing data checklist", "Template downloads"].map(item => `<span class="badge info">${item}</span>`).join("")}
      </div>
    </section>
    ${renderPilotRequestForm()}
    ${renderImportExportSection()}
    ${renderDocumentUploadSection()}
    ${renderSmartExtractionSection()}
  `;
}

function renderImportExportSection() {
  const importState = state.intakeImport;
  return `
    <section class="panel intake-section">
      <div class="panel-head">
        <div>
          <h2>Import / Export</h2>
          <p>Generate clean CSV exports locally or preview uploaded CSV records before applying them to local app state. Existing sample records are not overwritten.</p>
        </div>
      </div>
      <div class="intake-export-grid">
        ${Object.entries(intakeEntityConfig).map(([key, config]) => `
          <article class="intake-card">
            <div>
              <strong>${config.label}</strong>
              <span class="subtle">Required: ${config.requiredColumns.join(", ")}</span>
            </div>
            <div class="coverage-actions compact">
              <button class="ghost-button" type="button" data-export-csv="${key}">${config.buttonLabel}</button>
              <button class="ghost-button" type="button" data-template-csv="${key}">Download Template</button>
              <button class="ghost-button" type="button" data-demo-import="${key}">Preview Template</button>
            </div>
          </article>
        `).join("")}
      </div>
      ${state.lastCsvExport ? `
        <div class="coverage-note good">
          <strong>${escapeHtml(state.lastCsvExport.status)}</strong>
          <span>${escapeHtml(state.lastCsvExport.filename)} / ${state.lastCsvExport.rows} rows / ${state.lastCsvExport.columns} columns / ${escapeHtml(state.lastCsvExport.timestamp)}</span>
        </div>
      ` : ""}
      <div class="csv-import-box">
        <div>
          <h3>Local CSV upload</h3>
          <p class="subtle">Choose a pilot file type, upload a CSV file, review required-column, duplicate, and missing-data warnings, then apply or cancel.</p>
        </div>
        <div class="form-grid">
          <label>Import type
            <select id="importEntitySelect">
              ${Object.entries(intakeEntityConfig).map(([key, config]) => `<option value="${key}" ${state.intakeSelectedEntity === key ? "selected" : ""}>${config.label}</option>`).join("")}
            </select>
          </label>
          <label>CSV file
            <input id="csvImportFile" type="file" accept=".csv,text/csv">
          </label>
        </div>
      </div>
      ${importState ? renderImportPreview(importState) : ""}
      ${renderImportHistory()}
    </section>
  `;
}

function renderImportPreview(importState) {
  const config = intakeEntityConfig[importState.entity];
  const intakeSummary = createPilotIntakeSummary(importState);
  const blocked = Boolean(importState.validation.blocked);
  const parseBlocked = Boolean(importState.validation.parseErrors?.length);
  const needsReview = Boolean(importState.validation.rowWarnings.length || importState.validation.duplicateWarnings.length || importState.validation.headerWarnings?.length);
  return `
    <section class="import-preview">
      <div class="panel-head compact">
        <div>
          <h2>Import Preview: ${config.label}</h2>
          <p>${parseBlocked ? "Preview blocked by parse errors. Fix the CSV and upload again." : `${importState.rows.length} rows staged. Review warnings before applying.`}</p>
        </div>
        <span class="badge ${blocked ? "bad" : needsReview ? "warn" : "good"}">${blocked ? "Blocked" : needsReview ? "Needs review" : "Ready"}</span>
      </div>
      ${renderSmartIntakeSummary(intakeSummary)}
      <div class="warning-list" data-intake-warning-list></div>
      <div class="data-table-wrap">
        <table>
          <thead data-intake-preview-head></thead>
          <tbody data-intake-preview-body></tbody>
        </table>
      </div>
      <div class="coverage-actions">
        <button class="primary-button" type="button" data-apply-import ${blocked ? "disabled" : ""}>Apply Import</button>
        <button class="ghost-button" type="button" data-cancel-import>Cancel Import</button>
      </div>
    </section>
  `;
}

function renderImportHistory() {
  const entries = state.intakeImportedRecords.slice(0, 4);
  return `
    <div class="import-history" data-import-history-count="${state.intakeImportedRecords.length}">
      <div class="section-title compact">
        <div>
          <h3>Recent Local Imports</h3>
          <p>Applied previews stay in this browser session and do not overwrite sample records.</p>
        </div>
      </div>
      ${entries.length ? `
        <div class="status-list">
          ${entries.map(entry => `
            <article class="coverage-note good" data-import-history-entry>
              <strong>${escapeHtml(entry.entity)}</strong>
              <span>${entry.rows.length} ${entry.rows.length === 1 ? "row" : "rows"} from ${escapeHtml(entry.source)} at ${escapeHtml(entry.appliedAt)}</span>
            </article>
          `).join("")}
        </div>
      ` : `<div class="empty-state" data-import-history-empty>No local imports applied yet.</div>`}
    </div>
  `;
}

function hydrateIntakePreviewSinks() {
  if (!state.intakeImport) return;
  const safety = getPilotIntakeSafety();
  const validation = state.intakeImport.validation || {};
  const warningList = document.querySelector("[data-intake-warning-list]");
  if (warningList) {
    warningList.textContent = "";
    const warningGroups = [
      ["bad", (validation.parseErrors || []).map(error => `Parse error: ${error}`)],
      ["bad", (validation.missingColumns || []).map(column => `Missing column: ${column}`)],
      ["warn", validation.headerWarnings || []],
      ["warn", (validation.rowWarnings || []).slice(0, 8)],
      ["warn", (validation.duplicateWarnings || []).slice(0, 8)]
    ];
    const warnings = warningGroups.flatMap(([tone, items]) => items.map(text => ({ tone, text })));
    if (warnings.length) {
      warnings.forEach(item => safety.appendTextElement(document, warningList, "span", item.text, `badge ${item.tone}`));
    } else {
      safety.appendTextElement(document, warningList, "span", "Required columns present", "badge good");
    }
  }

  const columns = state.intakeImport.columns?.length
    ? state.intakeImport.columns
    : Object.keys(state.intakeImport.rows[0] || {}).map((key, index) => ({ key, displayName: key, index }));
  const head = document.querySelector("[data-intake-preview-head]");
  const body = document.querySelector("[data-intake-preview-body]");
  if (!head || !body) return;
  head.textContent = "";
  body.textContent = "";
  const headerRow = document.createElement("tr");
  columns.forEach(column => safety.appendTextElement(document, headerRow, "th", column.displayName));
  head.appendChild(headerRow);
  state.intakeImport.rows.slice(0, 6).forEach(row => {
    const tableRow = document.createElement("tr");
    columns.forEach(column => safety.appendTextElement(document, tableRow, "td", row[column.key] || ""));
    body.appendChild(tableRow);
  });
}

function hydrateDocumentUploadSinks() {
  const safety = getPilotIntakeSafety();
  document.querySelectorAll("[data-document-index]").forEach(card => {
    const record = state.intakeDocuments[Number(card.dataset.documentIndex)];
    if (!record) return;
    card.querySelectorAll("[data-document-field]").forEach(field => {
      safety.setTextContent(field, record[field.dataset.documentField] || "");
    });
  });
}

function hydrateSafeTextSinks() {
  hydrateIntakePreviewSinks();
  hydrateDocumentUploadSinks();
}

function renderDocumentUploadSection() {
  return `
    <section class="panel intake-section">
      <div class="panel-head">
        <div>
          <h2>Document Uploads</h2>
          <p>Stage files locally for pilot review. Documents are not uploaded to a server.</p>
        </div>
      </div>
      <div class="document-upload-grid">
        <div class="form-grid">
          <label>Document type
            <select id="documentTypeSelect">${intakeDocumentTypes.map(type => `<option>${type}</option>`).join("")}</select>
          </label>
          <label>Related project
            <select id="documentProjectSelect">${projects.map(project => `<option>${project.name}</option>`).join("")}</select>
          </label>
          <label>Related technician
            <select id="documentTechSelect">${technicians.slice(0, 12).map(tech => `<option>${tech.name}</option>`).join("")}</select>
          </label>
          <label>Related equipment
            <select id="documentEquipmentSelect">${equipment.slice(0, 12).map(item => `<option>${item.id}</option>`).join("")}</select>
          </label>
          <label>Notes
            <textarea id="documentNotesInput" rows="3">Local pilot intake item.</textarea>
          </label>
          <label>Files
            <input id="documentUploadInput" type="file" multiple>
          </label>
        </div>
        <div class="document-list">
          ${state.intakeDocuments.length ? state.intakeDocuments.map((doc, index) => `
            <article class="document-card" data-document-index="${index}">
              <div class="coverage-card-top">
                <strong data-document-field="fileName"></strong>
                <span class="badge ${toneForStatus(doc.status)}">${doc.status}</span>
              </div>
              <div class="coverage-detail-grid">
                <div><span>Type</span><strong data-document-field="type"></strong></div>
                <div><span>Project</span><strong data-document-field="project"></strong></div>
                <div><span>Technician</span><strong data-document-field="technician"></strong></div>
                <div><span>Equipment</span><strong data-document-field="equipment"></strong></div>
                <div><span>Upload date</span><strong data-document-field="uploadDate"></strong></div>
                <div><span>Notes</span><strong data-document-field="notes"></strong></div>
              </div>
            </article>
          `).join("") : `<div class="empty-state">No local documents staged yet. Choose files to add pilot upload records.</div>`}
        </div>
      </div>
    </section>
  `;
}

function renderSmartExtractionSection() {
  const sample = state.extractionSample ? extractionSamples[state.extractionSample] : null;
  return `
    <section class="panel intake-section">
      <div class="panel-head">
        <div>
          <h2>Document Field Preview</h2>
          <p>Review-assisted field extraction. Extracted data must be verified before saving.</p>
        </div>
        <span class="badge warn">Review required</span>
      </div>
      <div class="extraction-controls">
        <label>Sample document
          <select id="sampleExtractionSelect">
            <option value="concrete">Concrete Field Report</option>
            <option value="calibration">Calibration Certificate</option>
            <option value="certification">Certification Card</option>
          </select>
        </label>
        <button class="primary-button" type="button" data-scan-sample>Scan Sample Document</button>
        <label>Send to module
          <select id="sendExtractionModule">
            <option>Reports</option>
            <option>Equipment</option>
            <option>Certifications</option>
            <option>Laboratory</option>
            <option>Projects</option>
          </select>
        </label>
      </div>
      ${sample ? renderExtractionPreview(sample) : `<div class="empty-state">Select a sample and click Scan Sample Document to preview extracted fields.</div>`}
      ${state.extractionMessage ? `<div class="coverage-note good"><strong>${state.extractionMessage}</strong><span>Saved locally for review in this browser session.</span></div>` : ""}
      ${state.extractionSaved.length ? `
        <section class="location-audit">
          <strong>Extraction activity log</strong>
          ${state.extractionSaved.map(item => `<span>${item.timestamp} / ${item.title} saved to ${item.module} by ${item.role}.</span>`).join("")}
        </section>
      ` : ""}
    </section>
  `;
}

function renderExtractionPreview(sample) {
  return `
    <div class="extraction-preview-grid">
      <div class="document-preview-placeholder">
        <strong>${sample.title}</strong>
        <span>Document preview staging area</span>
        <span class="subtle">Local workflow only. No OCR or external AI service is called.</span>
      </div>
      <div class="extracted-fields">
        <h3>Extracted fields</h3>
        <div class="coverage-detail-grid">
          ${Object.entries(sample.fields).map(([key, value]) => `<div><span>${key}</span><strong>${value}</strong></div>`).join("")}
        </div>
      </div>
      <div class="extracted-fields">
        <h3>Confidence levels</h3>
        <div class="warning-list">
          ${Object.entries(sample.confidence).map(([key, value]) => `<span class="badge ${value === "High" ? "good" : value === "Medium" ? "warn" : "bad"}">${key}: ${value}</span>`).join("")}
        </div>
        <h3>Fields needing review</h3>
        <div class="status-list">
          ${sample.warnings.map(warning => `<div class="activity-row"><strong>${warning}</strong><span class="subtle">Verify before saving.</span></div>`).join("")}
        </div>
      </div>
    </div>
    <div class="coverage-actions">
      <button class="primary-button" type="button" data-confirm-extraction>Confirm and Save</button>
    </div>
  `;
}

function renderSettings() {
  const settings = [
    "Company profile",
    "Branches",
    "User roles",
    "Service types",
    "Certification types",
    "Equipment categories",
    "Billing rates",
    "Labor cost rates",
    "Report templates",
    "Alert thresholds",
    "Map settings",
    "Integrations"
  ];
  return `
    <section class="panel demo-story-settings">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Pilot Story Mode</p>
          <h2>Demo Walkthrough Controls</h2>
          <p>Restart the guided buyer story and reset the TRD-104 demo state without changing role, theme, or appearance settings.</p>
        </div>
        <button class="primary-button" type="button" data-restart-walkthrough>Restart Demo Walkthrough</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Admin Settings</h2>
          <p>Configure branch operations, permissions, rates, templates, thresholds, map behavior, and future integrations.</p>
        </div>
      </div>
      <div class="grid four">
        ${settings.map(s => `<div class="activity-row"><strong>${s}</strong><span class="subtle">Configurable MVP setting</span></div>`).join("")}
      </div>
    </section>
    <section class="panel">
      <h2>Role Permissions</h2>
      <div class="grid three">
        ${Object.entries(roleAccess).map(([role, allowed]) => `<div class="activity-row"><strong>${role}</strong><span class="subtle">${allowed.map(id => pageLabels[id] || id).join(", ")}</span></div>`).join("")}
      </div>
    </section>
  `;
}

function renderTablePanel(title, description, id, rows, columns) {
  const filterValue = state.filters[id] || "";
  const visible = filterRows(rows, columns, filterValue);
  const sorted = sortRows(id, visible);
  return `
    <section class="table-panel">
      <div class="table-head">
        <div>
          <h2>${title}</h2>
          <p>${description}</p>
        </div>
        <span class="badge info">${visible.length} records</span>
      </div>
      <div class="filter-row">
        <input class="table-filter" data-table="${id}" type="search" placeholder="Filter ${title.toLowerCase()}..." value="${escapeHtml(filterValue)}">
      </div>
      <div class="data-table-wrap">
        <table data-table-id="${id}">
          <thead>
            <tr>${columns.map(([key, label]) => `<th class="sortable" data-sort="${key}">${label}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${sorted.map(row => `<tr>${columns.map(([key]) => `<td>${formatCell(row, key)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}" class="empty-state">No matching records.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function filterRows(rows, columns, query) {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter(row => columns.some(([key]) => String(row[key] ?? "").toLowerCase().includes(q)));
}

function sortRows(tableId, rows) {
  const sort = state.sorts[tableId];
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    const result = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av ?? "").localeCompare(String(bv ?? ""));
    return sort.dir === "asc" ? result : -result;
  });
}

function formatCell(row, key) {
  const value = row[key];
  if (Array.isArray(value)) return `<div class="pill-list">${value.map(v => `<span class="badge info">${escapeHtml(v)}</span>`).join("")}</div>`;
  if (["status", "priority", "billing", "breaksDue", "report", "health", "condition"].includes(key)) return `<span class="badge ${toneForStatus(String(value))}">${escapeHtml(String(value))}</span>`;
  if (key === "margin") return `<span class="badge ${Number(value) < 20 ? "warn" : "good"}">${value}%</span>`;
  return escapeHtml(String(value ?? ""));
}

function escapeHtml(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadCsv(filename, rows, columns) {
  state.lastCsvExport = {
    filename,
    rows: rows.length,
    columns: columns.length,
    timestamp: getDemoTimestamp(),
    status: "CSV prepared locally"
  };
  const blob = new Blob([rowsToCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  if (!getPilotIntakeSafety().isAllowedUrl(url, ["blob:"])) {
    state.lastCsvExport.status = "CSV prepared; browser blocked unsafe download URL";
    URL.revokeObjectURL(url);
    render();
    return;
  }
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } catch (error) {
    state.lastCsvExport.status = "CSV prepared; download blocked by browser preview";
  }
  link.remove();
  URL.revokeObjectURL(url);
}

function stageImport(entity, rowsOrParseResult, source = "Uploaded CSV") {
  const safeEntity = intakeEntityConfig[entity] ? entity : "technicians";
  const config = intakeEntityConfig[safeEntity];
  const safety = getPilotIntakeSafety();
  const parseResult = Array.isArray(rowsOrParseResult)
    ? safety.createParseResultFromRows(rowsOrParseResult, Object.keys(rowsOrParseResult[0] || Object.fromEntries(config.requiredColumns.map(column => [column, ""]))))
    : rowsOrParseResult;
  const validation = validateImport(safeEntity, parseResult);
  const rows = Array.isArray(parseResult?.rows) ? parseResult.rows : [];
  const columns = Array.isArray(parseResult?.columns) ? parseResult.columns : [];
  state.intakeSelectedEntity = safeEntity;
  state.intakeImport = {
    entity: safeEntity,
    rows,
    columns,
    source,
    validation
  };
  render();
}

function applyImport() {
  if (!state.intakeImport || state.intakeImport.validation?.blocked) return;
  const entry = {
    entity: intakeEntityConfig[state.intakeImport.entity].label,
    rows: state.intakeImport.rows,
    appliedAt: getDemoTimestamp(),
    source: state.intakeImport.source
  };
  state.intakeImportedRecords.unshift(entry);
  state.intakeImport = null;
  render();
}

function stageUploadedDocuments(files) {
  const type = document.getElementById("documentTypeSelect")?.value || "Other";
  const project = document.getElementById("documentProjectSelect")?.value || "";
  const technician = document.getElementById("documentTechSelect")?.value || "";
  const equipmentId = document.getElementById("documentEquipmentSelect")?.value || "";
  const notes = document.getElementById("documentNotesInput")?.value || "";
  const uploadDate = new Date().toLocaleDateString();
  const docs = Array.from(files).map(file => getPilotIntakeSafety().normalizeDocumentRecord({
    fileName: file.name,
    type,
    project,
    technician,
    equipment: equipmentId,
    uploadDate,
    status: "Needs review",
    notes
  }));
  state.intakeDocuments.unshift(...docs);
  render();
}

function scanSampleDocument() {
  const selected = document.getElementById("sampleExtractionSelect")?.value || "concrete";
  state.extractionSample = selected;
  state.extractionMessage = "";
  render();
}

function confirmExtractionSave() {
  const key = state.extractionSample || "concrete";
  const sample = extractionSamples[key];
  const module = document.getElementById("sendExtractionModule")?.value || sample.module;
  state.extractionSaved.unshift({
    title: sample.title,
    module,
    role: state.role,
    timestamp: getDemoTimestamp(),
    fields: sample.fields
  });
  state.extractionMessage = "Document extracted and saved for review";
  render();
}

function wirePageControls() {
  document.querySelectorAll(".table-filter").forEach(input => {
    input.addEventListener("input", event => {
      state.filters[event.target.dataset.table] = event.target.value;
      render();
    });
  });

  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", event => {
      const table = event.target.closest("table").dataset.tableId;
      const key = event.target.dataset.sort;
      const current = state.sorts[table];
      state.sorts[table] = { key, dir: current && current.key === key && current.dir === "asc" ? "desc" : "asc" };
      render();
    });
  });

  document.querySelectorAll("[data-filter-key]").forEach(select => {
    select.addEventListener("change", event => {
      state.filters[event.target.dataset.filterKey] = event.target.value;
      render();
    });
  });

  document.querySelectorAll("[data-sort-key]").forEach(select => {
    select.addEventListener("change", event => {
      state.sorts[event.target.dataset.sortKey] = { key: event.target.value, dir: "asc" };
      render();
    });
  });

  document.querySelectorAll("[data-dispatch-order]").forEach(button => {
    button.addEventListener("click", event => {
      state.selectedWorkOrder = event.currentTarget.dataset.dispatchOrder;
      render();
    });
  });

  const dispatchSelect = document.getElementById("dispatchWorkOrder");
  if (dispatchSelect) {
    dispatchSelect.addEventListener("change", event => {
      state.selectedWorkOrder = event.target.value;
      render();
    });
  }

  document.querySelectorAll("[data-export-csv]").forEach(button => {
    button.addEventListener("click", event => {
      const entity = event.currentTarget.dataset.exportCsv;
      const config = intakeEntityConfig[entity];
      downloadCsv(`cmtcommand-${entity}.csv`, config.rows(), config.requiredColumns);
      render();
    });
  });

  document.querySelectorAll("[data-template-csv]").forEach(button => {
    button.addEventListener("click", event => {
      const entity = event.currentTarget.dataset.templateCsv;
      const config = intakeEntityConfig[entity];
      downloadCsv(`cmtcommand-${entity}-template.csv`, makeTemplateRows(entity), config.requiredColumns);
      render();
    });
  });

  document.querySelectorAll("[data-demo-import]").forEach(button => {
    button.addEventListener("click", event => {
      const entity = event.currentTarget.dataset.demoImport;
      stageImport(entity, makeTemplateRows(entity), "Demo template preview");
    });
  });

  const importEntitySelect = document.getElementById("importEntitySelect");
  if (importEntitySelect) {
    importEntitySelect.addEventListener("change", event => {
      if (intakeEntityConfig[event.target.value]) state.intakeSelectedEntity = event.target.value;
    });
  }

  const csvImportFile = document.getElementById("csvImportFile");
  if (csvImportFile) {
    csvImportFile.addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const entity = document.getElementById("importEntitySelect")?.value || state.intakeSelectedEntity || "technicians";
      const safety = getPilotIntakeSafety();
      const readToken = state.intakeImportReadToken + 1;
      state.intakeImportReadToken = readToken;
      if (file.size > safety.MAX_CSV_CHARACTERS) {
        stageImport(entity, safety.createErrorParseResult(`CSV file "${file.name}" is too large for local preview (${file.size} bytes; limit ${safety.MAX_CSV_CHARACTERS}).`), file.name);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (state.intakeImportReadToken !== readToken) return;
        stageImport(entity, parseCsv(String(reader.result || "")), file.name);
      };
      reader.onerror = () => {
        if (state.intakeImportReadToken !== readToken) return;
        stageImport(entity, safety.createErrorParseResult(`CSV file "${file.name}" could not be read. Choose a readable CSV and try again.`), file.name);
      };
      try {
        reader.readAsText(file);
      } catch (error) {
        stageImport(entity, safety.createErrorParseResult(`CSV file "${file.name}" could not be opened by this browser.`), file.name);
      }
    });
  }

  const applyImportButton = document.querySelector("[data-apply-import]");
  if (applyImportButton) applyImportButton.addEventListener("click", applyImport);

  const cancelImportButton = document.querySelector("[data-cancel-import]");
  if (cancelImportButton) {
    cancelImportButton.addEventListener("click", () => {
      state.intakeImport = null;
      render();
    });
  }

  const documentUploadInput = document.getElementById("documentUploadInput");
  if (documentUploadInput) {
    documentUploadInput.addEventListener("change", event => {
      if (event.target.files.length) stageUploadedDocuments(event.target.files);
    });
  }

  const scanSampleButton = document.querySelector("[data-scan-sample]");
  if (scanSampleButton) scanSampleButton.addEventListener("click", scanSampleDocument);

  const confirmExtractionButton = document.querySelector("[data-confirm-extraction]");
  if (confirmExtractionButton) confirmExtractionButton.addEventListener("click", confirmExtractionSave);
}

function renderGlobalResults(query) {
  const shell = document.getElementById("globalResults");
  if (!query.trim()) {
    shell.hidden = true;
    shell.innerHTML = "";
    return;
  }
  const q = query.toLowerCase();
  const entries = [
    ...projects.map(p => ({ type: "Project", title: p.name, meta: `${p.id} / ${p.client}`, page: "projects" })),
    ...workOrders.map(w => ({ type: "Work order", title: `${w.id} / ${w.service}`, meta: `${w.project} / ${w.technician}`, page: "workorders" })),
    ...technicians.map(t => ({ type: "Technician", title: t.name, meta: `${t.role} / ${t.status}`, page: "technicians" })),
    ...equipment.map(e => ({ type: "Equipment", title: e.id, meta: `${e.category} / ${e.status}`, page: "equipment" })),
    ...certifications.map(c => ({ type: "Certification", title: c.type, meta: `${c.technician} / ${c.status}`, page: "certifications" }))
  ].filter(item => `${item.type} ${item.title} ${item.meta}`.toLowerCase().includes(q)).slice(0, 8);

  shell.hidden = false;
  shell.innerHTML = entries.length ? entries.map(item => `
    <button class="result-row link-button" type="button" data-page="${item.page}">
      <span class="badge info">${item.type}</span>
      <span><strong>${escapeHtml(item.title)}</strong><br><span class="subtle">${escapeHtml(item.meta)}</span></span>
      <span>Open</span>
    </button>
  `).join("") : `<div class="empty-state">No results for "${escapeHtml(query)}".</div>`;
}

function assignDemoCoverage(techId, shouldRender = true) {
  const order = getDemoWorkOrder(state.selectedDemoWorkOrder);
  const beforeReadinessData = getTomorrowReadinessData();
  const before = evaluateDemoReadiness(order);
  const candidate = getDemoCoverageCandidates(order).find(item => item.tech.id === techId) || getSelectedDemoCandidate(order);
  if (before.status === "Ready") return;
  if (!candidate || !candidate.canAssign) return;
  state.demoAssignments[order.id] = candidate.tech.id;
  state.selectedDemoTech = candidate.tech.id;
  state.demoCoverageOpen = true;
  const updated = evaluateDemoReadiness(order);
  const afterReadinessData = getTomorrowReadinessData();
  const notReadyReduction = Math.max(0, beforeReadinessData.notReady - afterReadinessData.notReady);
  const impactLanguage = notReadyReduction
    ? `Impact: approving ${candidate.tech.name} resolved the highest-risk coverage blocker for tomorrow and reduced not-ready work by ${notReadyReduction}.`
    : `Impact: approving ${candidate.tech.name} resolved the ${order.id} coverage blocker and moved the work order from ${before.status} to ${updated.status}.`;
  state.demoDecision = {
    workOrder: order.id,
    technician: candidate.tech.name,
    status: updated.status,
    tone: updated.tone,
    note: state.demoDecisionNote.trim(),
    timestamp: getDemoTimestamp(),
    equipmentPlan: updated.equipmentPlan.map(item => item.name).join(", "),
    remainingRisks: updated.warnings.length ? updated.warnings.join(" ") : "None after reassignment.",
    impactLanguage
  };
  const entry = enrichDecisionEntry({
    id: `EDL-${String(state.emergencyDecisionLog.length + 1).padStart(3, "0")}`,
    timestamp: state.demoDecision.timestamp,
    role: state.role,
    emergencyWorkOrder: `${order.id} / ${order.project}`,
    decisionType: "Approve Coverage",
    issue: before.reasons.join(" "),
    recommendedAction: `Assign ${candidate.tech.name} to ${order.id}`,
    approvedAction: `Approved ${candidate.tech.name} for ${order.service}`,
    assignedTechnician: candidate.tech.name,
    replacementTechnician: "",
    partnerFirm: "",
    required: `${updated.requiredCerts.join(", ")} / ${updated.requiredClearance.join(", ")}`,
    reason: `Recommended: assign ${candidate.tech.name}. ${candidate.tech.name} has the required certification, required clearance, access to the planned equipment, and the move has this impact: ${candidate.impact.detail}`,
    remainingRisks: state.demoDecision.remainingRisks,
    jobsAffected: [order.id, candidate.impact.detail],
    equipmentAffected: updated.equipmentPlan.map(item => item.name),
    readinessChecksUsed: ["Availability", "Certifications", "Clearance", "Equipment calibration", "Cascading impact"],
    cascadingImpact: candidate.impact.detail,
    beforeStatus: before.status,
    afterStatus: updated.status,
    impactLanguage,
    notReadyBeforeDecision: beforeReadinessData.notReady,
    notReadyAfterDecision: afterReadinessData.notReady,
    notes: state.demoDecision.note || "Coverage approved from Find Coverage workflow.",
    statusAfterDecision: `${order.id} moved from ${before.status} to ${updated.status}.`
  });
  state.emergencyDecisionLog.unshift(entry);
  state.emergencyDecisionLog = state.emergencyDecisionLog.slice(0, 8);
  if (shouldRender) render();
}

function submitPilotRequest(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const entry = {
    ...data,
    submittedAt: getDemoTimestamp()
  };
  state.pilotRequests.unshift(entry);
  state.pilotConfirmation = `${entry.company || "Pilot request"} saved locally for this pilot conversation.`;
  form.reset();
  render();
}

function openPickupSuggestions(pickupId = "") {
  if (pickupId) state.selectedCylinderPickup = pickupId;
  const pickup = getSelectedCylinderPickup();
  const suggestions = getPickupSuggestions(pickup);
  state.pickupSuggestionsOpen = true;
  state.selectedPickupTech = state.selectedPickupTech || suggestions.find(item => item.canAssign)?.tech.id || suggestions[0]?.tech.id || "";
  render();
}

function assignCylinderPickup(techId) {
  const pickup = getSelectedCylinderPickup();
  const suggestion = getPickupSuggestions(pickup).find(item => item.tech.id === techId);
  if (!suggestion || !suggestion.canAssign) return;
  state.pickupAssignments[pickup.id] = techId;
  state.selectedPickupTech = techId;
  state.pickupSuggestionsOpen = true;
  render();
}

async function copyOperationalText(text, button) {
  const original = button.dataset.copyLabel || button.textContent || "Copy";
  button.disabled = true;
  const result = await getDemoShared().copyTextToClipboard(text, {
    clipboard: navigator.clipboard,
    document
  });
  button.textContent = result.ok ? "Copied" : "Copy unavailable";
  window.setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1300);
}

document.addEventListener("click", event => {
  const copyButton = event.target.closest("[data-copy-payload]");
  if (copyButton) {
    copyOperationalText(decodeURIComponent(copyButton.dataset.copyPayload || ""), copyButton);
    return;
  }
  const startWalkthrough = event.target.closest("[data-start-walkthrough]");
  if (startWalkthrough) {
    startDemoWalkthrough();
    return;
  }
  const restartWalkthrough = event.target.closest("[data-restart-walkthrough]");
  if (restartWalkthrough) {
    restartDemoWalkthrough();
    return;
  }
  const walkthroughNext = event.target.closest("[data-walkthrough-next]");
  if (walkthroughNext) {
    advanceWalkthroughStep();
    return;
  }
  const walkthroughBack = event.target.closest("[data-walkthrough-back]");
  if (walkthroughBack) {
    previousWalkthroughStep();
    return;
  }
  const walkthroughSkip = event.target.closest("[data-walkthrough-skip]");
  if (walkthroughSkip) {
    skipDemoWalkthrough();
    return;
  }
  const walkthroughClose = event.target.closest("[data-walkthrough-close]");
  if (walkthroughClose) {
    closeDemoWalkthrough();
    return;
  }
  const resetScorecard = event.target.closest("[data-reset-scorecard]");
  if (resetScorecard) {
    state.pilotScorecard = {};
    state.demoControlResetConfirm = false;
    render();
    return;
  }
  const resetWalkthroughState = event.target.closest("[data-demo-reset-walkthrough-state]");
  if (resetWalkthroughState) {
    resetWalkthroughStateOnly();
    return;
  }
  const resetDemoStory = event.target.closest("[data-demo-reset-story-state]");
  if (resetDemoStory) {
    resetDemoStoryState();
    return;
  }
  const resetPreDemo = event.target.closest("[data-reset-pre-demo-checklist]");
  if (resetPreDemo) {
    resetPreDemoChecklist();
    return;
  }
  const fullResetArm = event.target.closest("[data-demo-full-reset-arm]");
  if (fullResetArm) {
    state.demoControlResetConfirm = true;
    render();
    return;
  }
  const fullResetCancel = event.target.closest("[data-demo-full-reset-cancel]");
  if (fullResetCancel) {
    state.demoControlResetConfirm = false;
    render();
    return;
  }
  const fullResetConfirm = event.target.closest("[data-demo-full-reset-confirm]");
  if (fullResetConfirm) {
    runFullDemoReset();
    return;
  }
  const opsView = event.target.closest("[data-ops-view-mode]");
  if (opsView) {
    state.opsViewMode = opsView.dataset.opsViewMode === "expanded" ? "expanded" : "compressed";
    render();
    return;
  }
  const openCoverage = event.target.closest("[data-open-coverage]");
  if (openCoverage) {
    state.selectedDemoWorkOrder = openCoverage.dataset.openCoverage || "TRD-104";
    const order = getDemoWorkOrder(state.selectedDemoWorkOrder);
    state.demoCoverageOpen = true;
    state.selectedDemoTech = getSelectedDemoCandidate(order)?.tech.id || "";
    state.demoScriptStep = Math.max(state.demoScriptStep, 4);
    setPage("demo");
    return;
  }
  const openPickup = event.target.closest("[data-open-pickup]");
  if (openPickup) {
    openPickupSuggestions(openPickup.dataset.openPickup);
    return;
  }
  const optimizePickups = event.target.closest("[data-optimize-pickups]");
  if (optimizePickups) {
    openPickupSuggestions(state.selectedCylinderPickup);
    return;
  }
  const pickupTech = event.target.closest("[data-pickup-tech]");
  if (pickupTech) {
    state.selectedPickupTech = pickupTech.dataset.pickupTech;
    render();
    return;
  }
  const assignPickup = event.target.closest("[data-assign-pickup]");
  if (assignPickup) {
    assignCylinderPickup(assignPickup.dataset.assignPickup);
    return;
  }
  const workforceEmployee = event.target.closest("[data-workforce-employee]");
  if (workforceEmployee) {
    state.selectedWorkforceEmployee = workforceEmployee.dataset.workforceEmployee;
    render();
    return;
  }
  const demoReset = event.target.closest("[data-demo-reset]");
  if (demoReset) {
    resetDemoWorkflow();
    render();
    return;
  }
  const demoPrev = event.target.closest("[data-demo-script-prev]");
  if (demoPrev) {
    advanceDemoScript(-1);
    return;
  }
  const demoNext = event.target.closest("[data-demo-script-next]");
  if (demoNext) {
    advanceDemoScript(1);
    return;
  }
  const demoStep = event.target.closest("[data-demo-script-step]");
  if (demoStep) {
    state.demoScriptStep = Number(demoStep.dataset.demoScriptStep);
    if (state.demoScriptStep >= 1) state.selectedDemoWorkOrder = "TRD-104";
    if (state.demoScriptStep >= 4) {
      const order = getDemoWorkOrder(state.selectedDemoWorkOrder);
      state.demoCoverageOpen = true;
      state.selectedDemoTech = getSelectedDemoCandidate(order)?.tech.id || "";
    }
    if (state.demoScriptStep >= 5 && !state.demoDecisionNote) {
      state.demoDecisionNote = "Assign Maria Lopez for the 7:30 AM pour. Use SC-18, AM-09, TH-03, and CM-44 from the Springfield field cage before dispatch.";
    }
    if (state.demoScriptStep >= 7 && !state.demoDecision) {
      assignDemoCoverage(state.selectedDemoTech || "DT-02", false);
    }
    render();
    return;
  }
  const demoOrder = event.target.closest("[data-demo-workorder]");
  if (demoOrder) {
    if (event.target.closest("details")) return;
    state.selectedDemoWorkOrder = demoOrder.dataset.demoWorkorder;
    state.demoCoverageOpen = false;
    state.selectedDemoTech = "";
    state.demoDecision = null;
    render();
    return;
  }
  const demoFindCoverage = event.target.closest("[data-demo-find-coverage]");
  if (demoFindCoverage) {
    const order = getDemoWorkOrder(state.selectedDemoWorkOrder);
    state.demoCoverageOpen = true;
    state.selectedDemoTech = getSelectedDemoCandidate(order)?.tech.id || "";
    state.demoScriptStep = Math.max(state.demoScriptStep, 4);
    render();
    return;
  }
  const demoTech = event.target.closest("[data-demo-tech]");
  if (demoTech) {
    state.selectedDemoTech = demoTech.dataset.demoTech;
    render();
    return;
  }
  const demoAssign = event.target.closest("[data-demo-assign]");
  if (demoAssign) {
    state.demoScriptStep = Math.max(state.demoScriptStep, 7);
    assignDemoCoverage(demoAssign.dataset.demoAssign);
    return;
  }
  const emergencyDecision = event.target.closest("[data-emergency-decision]");
  if (emergencyDecision) {
    logEmergencyDecision(emergencyDecision.dataset.emergencyDecision);
    return;
  }
  const nav = event.target.closest("[data-page]");
  if (nav) {
    setPage(nav.dataset.page);
    return;
  }
  const techButton = event.target.closest("[data-tech]");
  if (techButton) {
    state.selectedTech = techButton.dataset.tech;
    render();
  }
});

document.getElementById("roleSelect").addEventListener("change", event => {
  state.role = event.target.value;
  setPage(state.activePage);
});

document.getElementById("uiModeSelect").addEventListener("change", event => {
  setUiMode(event.target.value);
});

document.getElementById("globalSearch").addEventListener("input", event => {
  renderGlobalResults(event.target.value);
});

document.addEventListener("input", event => {
  if (event.target.matches("[data-demo-note]")) {
    state.demoDecisionNote = event.target.value;
    state.demoScriptStep = Math.max(state.demoScriptStep, 5);
  }
  if (event.target.matches("[data-scorecard-key]")) {
    state.pilotScorecard = {
      ...state.pilotScorecard,
      [event.target.dataset.scorecardKey]: event.target.checked
    };
  }
  if (event.target.matches("[data-pre-demo-check]")) {
    state.preDemoChecklist = {
      ...state.preDemoChecklist,
      [event.target.dataset.preDemoCheck]: event.target.checked
    };
    persistPreDemoChecklistState();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.isWalkthroughActive) {
    skipDemoWalkthrough();
  }
});

document.addEventListener("submit", event => {
  const form = event.target.closest("[data-pilot-form]");
  if (!form) return;
  event.preventDefault();
  submitPilotRequest(form);
});

document.getElementById("refreshButton").addEventListener("click", () => {
  document.getElementById("globalSearch").value = "";
  renderGlobalResults("");
  render();
});

document.getElementById("themeToggle").addEventListener("click", toggleTheme);

applyUiMode();
applyTheme();
setPage("command");
