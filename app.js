const pages = [
  ["command", "Command Center", "CC"],
  ["dispatch", "Dispatch Map", "DM"],
  ["projects", "Projects", "PR"],
  ["workorders", "Work Orders", "WO"],
  ["technicians", "Technicians", "TX"],
  ["certifications", "Certifications", "CE"],
  ["equipment", "Equipment", "EQ"],
  ["laboratory", "Laboratory", "LB"],
  ["geotechnical", "Geotechnical", "GT"],
  ["reports", "Reports", "RP"],
  ["billing", "Billing / Profitability", "BI"],
  ["settings", "Settings", "ST"]
];

const roleAccess = {
  "Executive": pages.map(([id]) => id),
  "Branch Manager": pages.map(([id]) => id),
  "Dispatcher": ["command", "dispatch", "projects", "workorders", "technicians", "certifications", "equipment"],
  "Project Manager": ["command", "projects", "workorders", "technicians", "laboratory", "geotechnical", "reports", "billing"],
  "Lab Manager": ["command", "workorders", "technicians", "certifications", "equipment", "laboratory", "reports"],
  "Field Technician": ["workorders", "technicians", "certifications", "equipment", "reports"],
  "Geotechnical Engineer": ["command", "projects", "workorders", "equipment", "laboratory", "geotechnical", "reports"],
  "Admin / Billing": ["command", "projects", "workorders", "reports", "billing", "settings"]
};

const authorizedLocationRoles = new Set(["Executive", "Branch Manager", "Dispatcher"]);

const state = {
  activePage: "command",
  role: "Executive",
  selectedTech: "T-1006",
  selectedWorkOrder: "WO-2431",
  filters: {},
  sorts: {},
  locationViewLog: [],
  lastLocationLogKey: ""
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
    manufacturer: ["Troxler", "Humboldt", "Gilson", "Ford", "Apple", "CMT LabWorks"][i % 6],
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

function setPage(id) {
  const allowed = roleAccess[state.role];
  state.activePage = allowed.includes(id) ? id : allowed[0];
  const page = pages.find(([pageId]) => pageId === state.activePage);
  document.getElementById("pageTitle").textContent = page[1];
  document.getElementById("roleEyebrow").textContent = `${state.role} view`;
  renderNav();
  render();
}

function render() {
  const view = {
    command: renderCommandCenter,
    dispatch: renderDispatch,
    projects: renderProjects,
    workorders: renderWorkOrders,
    technicians: renderTechnicians,
    certifications: renderCertifications,
    equipment: renderEquipment,
    laboratory: renderLaboratory,
    geotechnical: renderGeotechnical,
    reports: renderReports,
    billing: renderBilling,
    settings: renderSettings
  }[state.activePage];
  document.getElementById("app").innerHTML = view();
  wirePageControls();
}

function renderCommandCenter() {
  const activeProjects = projects.filter(p => p.status === "Active").length;
  const jobsToday = workOrders.filter(w => !["Complete", "Cancelled"].includes(w.status)).length;
  const available = technicians.filter(t => t.status === "Available").length;
  const onsite = technicians.filter(t => t.status === "Onsite").length;
  const unstaffed = workOrders.filter(w => !w.techId).length;
  const certSoon = certifications.filter(c => c.status !== "Active").length;
  const eqOverdue = equipment.filter(e => ["Maintenance needed", "Out of service"].includes(e.status) || new Date(e.calibrationDue) < new Date("2026-06-09")).length;
  const utilization = Math.round(technicians.reduce((sum, t) => sum + t.workload, 0) / technicians.length);
  const revenueToday = workOrders.filter(w => w.status !== "Complete").length * 1180;
  const readiness = Math.round(projects.reduce((sum, p) => sum + projectReadiness(p).score, 0) / projects.length);

  const criticalMetrics = [
    ["Unstaffed work orders", unstaffed, unstaffed ? "bad" : "good"],
    ["Resource readiness", `${readiness}%`, toneForScore(readiness)],
    ["Technicians available", available, "good"],
    ["Jobs scheduled today", jobsToday, "info"],
    ["Estimated revenue today", money(revenueToday), "neutral"]
  ];

  const operatingMetrics = [
    ["Active projects", activeProjects, "info"],
    ["Technicians onsite", onsite, "info"],
    ["Open work orders", workOrders.filter(w => w.status !== "Complete").length, "neutral"],
    ["Reports awaiting review", reports.length, "warn"],
    ["Lab breaks due today", concreteSets.filter(s => s.breaksDue === "Today").length, "warn"],
    ["Certs expiring soon", certSoon, certSoon ? "warn" : "good"],
    ["Equipment issues", eqOverdue, eqOverdue ? "bad" : "good"],
    ["Nuclear gauges assigned", equipment.filter(e => e.category === "Nuclear gauge" && e.status !== "Available").length, "info"],
    ["Average utilization", `${utilization}%`, utilization > 88 ? "warn" : "good"]
  ];

  const alerts = [
    ["bad", "Unassigned job starting within 2 hours", "WO-2431 needs WACEL Soils and a nuclear gauge."],
    ["bad", "Technician assigned without required certification", "Post-tension inspection has no ICC concrete credential assigned."],
    ["warn", "Certification expiring within 30 days", "7 credentials need renewal planning."],
    ["bad", "Equipment calibration overdue", "NG-180 and AM-191 need review before dispatch."],
    ["warn", "Cylinder break due today", "4 concrete sets need 7-day or 28-day breaks."],
    ["bad", "Project over budget", "Arlington Medical Pavilion is at 89% of budgeted hours."],
    ["warn", "Missing boring log review", "2 boring logs pending geotechnical engineer sign-off."]
  ];

  return `
    <section class="command-section">
      <div class="section-title">
        <div>
          <h2>Critical Operating KPIs</h2>
          <p>Branch-level signals that need the fastest scan at the start of the day.</p>
        </div>
      </div>
      <div class="grid metric-grid critical">${criticalMetrics.map(renderMetric).join("")}</div>
    </section>
    <section class="split command-row">
      <div class="panel readiness-panel">
        <div class="panel-head">
          <div>
            <h2>Resource Readiness</h2>
            <p>Qualified people, required equipment, lab capacity, and PM review capacity by major project.</p>
          </div>
          <span class="badge ${toneForScore(readiness)}">${readiness}% average</span>
        </div>
        <div class="status-list">
          ${projects.map(project => {
            const r = projectReadiness(project);
            return `
              <div class="readiness-row">
                <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
                  <strong>${project.name}</strong>
                  <span class="badge ${toneForScore(r.score)}">${r.score}% ready</span>
                </div>
                <div class="progress ${toneForScore(r.score)}"><span style="width:${r.score}%"></span></div>
                <span class="subtle">Required today: ${r.required.join(", ")}</span>
                <span class="subtle">Missing: ${r.missing.length ? r.missing.join(", ") : "None"}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
      <div class="panel risk-panel">
        <div class="panel-head">
          <div>
            <h2>Today's Risk Alerts</h2>
            <p>Operational issues that need dispatch, lab, PM, or management attention.</p>
          </div>
        </div>
        <div class="status-list">
          ${alerts.map(a => `
            <div class="alert-row">
              <span class="dot ${a[0]}"></span>
              <div><strong>${a[1]}</strong><br><span class="subtle">${a[2]}</span></div>
              <span class="badge ${a[0]}">${a[0] === "bad" ? "Risk" : "Watch"}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
    <section class="command-section">
      <div class="section-title">
        <div>
          <h2>Today's Workload</h2>
          <p>Dispatch, lab, billing, and secondary operating signals.</p>
        </div>
      </div>
      <div class="grid metric-grid secondary">${operatingMetrics.map(renderMetric).join("")}</div>
    </section>
    <section class="grid three operations-grid">
      ${previewPanel("Dispatch pulse", [
        `${unstaffed} work orders unstaffed`,
        `${technicians.filter(t => t.status === "En route").length} technicians en route`,
        "Emergency request near Potomac Yard"
      ], "dispatch")}
      ${previewPanel("Lab workload", [
        `${concreteSets.filter(s => s.breaksDue === "Overdue").length} overdue breaks`,
        `${soilTests.filter(t => t.status !== "Complete").length} soil tests active`,
        "Capacity level: 86%"
      ], "laboratory")}
      ${previewPanel("Profitability", [
        `${money(projects.reduce((sum, p) => sum + p.contract, 0))} active contract value`,
        "Lowest margin: Arlington Medical Pavilion",
        "Unbilled work orders: 11"
      ], "billing")}
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
    "Average utilization": "Field staff current load"
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
  logLocationView("Dispatch Map");
  return `
    <section class="dispatch-command">
      <div class="map-panel panel">
        <div class="panel-head">
          <div>
            <h2>Live Dispatch Map</h2>
            <p>Job sites, technicians, drill rigs, equipment locations, routes, and emergency requests.</p>
          </div>
          <div class="panel-actions">
            <span class="badge bad">${workOrders.filter(w => !w.techId).length} unassigned</span>
            <span class="badge info">${technicians.filter(t => t.status === "Available").length} available techs</span>
          </div>
        </div>
        <div class="map-canvas" aria-label="Illustrative dispatch map">
          ${renderRoads()}
          ${projects.map((p, i) => `<button class="map-pin project" title="${p.name}" style="left:${12 + i * 16}%;top:${18 + (i % 3) * 21}%;">P</button>`).join("")}
          ${renderTechnicianLocationPins(selected)}
          ${["1", "2", "3"].map((n, i) => `<button class="map-pin rig" title="Drill Rig ${n}" style="left:${68 + i * 7}%;top:${20 + i * 16}%;">R</button>`).join("")}
          ${equipment.slice(0, 4).map((e, i) => `<button class="map-pin equipment" title="${e.id} - ${e.status}" style="left:${36 + i * 12}%;top:${31 + i * 10}%;">E</button>`).join("")}
          <button class="map-pin emergency" title="Emergency request" style="left:83%;top:65%;">!</button>
          <div class="map-legend">
            <span><i class="dot info"></i> Job site</span>
            <span><i class="dot good"></i> Work-hour technician</span>
            <span><i class="dot"></i> Drill rig</span>
            <span><i class="dot warn"></i> Equipment</span>
            <span><i class="dot bad"></i> Emergency</span>
          </div>
        </div>
        ${renderFieldStatusPanel(selected)}
      </div>
      <aside class="panel dispatch-panel">
        <div class="panel-head">
          <div>
            <h2>Dispatch Recommendation</h2>
            <p>Select an unassigned or at-risk work order to rank qualified technicians.</p>
          </div>
        </div>
        <label class="form-grid">
          <span>Work order</span>
          <select id="dispatchWorkOrder" class="field-input">
            ${workOrders.filter(w => !w.techId || w.status === "Problem / delayed").slice(0, 12).map(w => `<option ${w.id === selected.id ? "selected" : ""} value="${w.id}">${w.id} - ${w.service}</option>`).join("")}
          </select>
        </label>
        <div class="selected-order">
          <span class="badge ${toneForStatus(selected.status)}">${selected.status}</span>
          <strong>${selected.project}</strong>
          <span class="subtle">${selected.id} / ${selected.service}</span>
          <dl>
            <div><dt>Required</dt><dd>${selected.requiredTime}</dd></div>
            <div><dt>Priority</dt><dd>${selected.priority}</dd></div>
            <div><dt>Equipment</dt><dd>${selected.requiredEquipment.join(", ")}</dd></div>
          </dl>
          <div class="pill-list">${selected.requiredCerts.map(c => `<span class="badge info">${c}</span>`).join("")}</div>
        </div>
        <div class="status-list">
          ${ranked.map(item => `
            <div class="recommendation-row">
              <div style="display:flex;justify-content:space-between;gap:10px;">
                <strong>${item.tech.name}</strong>
                <span class="badge ${item.tone}">${item.label}</span>
              </div>
              <span class="subtle">${item.reason}</span>
              <div class="progress ${item.tone}"><span style="width:${item.score}%"></span></div>
              <div class="match-meta">
                <span>${item.score}% match</span>
                <span>${item.tech.equipment}</span>
              </div>
              ${item.qualified ? "" : `<span class="badge bad">Warning: missing required certification</span>`}
            </div>
          `).join("")}
        </div>
        <button class="primary-button assign-button" type="button">${bestMatch?.qualified ? `Assign ${bestMatch.tech.name}` : "Assign Technician"}</button>
      </aside>
    </section>
    ${renderTablePanel("Today's Work Orders", "Filter, sort, and select work by priority, status, project, or technician.", "dispatchOrders", workOrders.slice(0, 16), [
      ["id", "WO"],
      ["project", "Project"],
      ["service", "Service"],
      ["technician", "Technician"],
      ["priority", "Priority"],
      ["status", "Status"]
    ])}
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
              <strong>${tech.name}</strong>
              <span class="subtle">${tech.location.label} / ${distance} mi to ${order.id}</span>
            </div>
            <div class="pill-list">
              <span class="badge ${toneForStatus(tech.fieldStatus)}">${tech.fieldStatus}</span>
              <span class="badge ${visibility.tone}">${visibility.label}</span>
            </div>
            <dl>
              <div><dt>Last updated</dt><dd>${tech.lastUpdatedMinutes} min ago</dd></div>
              <div><dt>Source</dt><dd>${tech.trackingSource}</dd></div>
              <div><dt>Assignment</dt><dd>${tech.location.nearestProject}</dd></div>
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
  const tech = technicians.find(t => t.id === state.selectedTech) || technicians[0];
  logLocationView(`Technician Profile: ${tech.name}`);
  const readiness = readinessScore(tech);
  const scores = [
    ["Certification", Math.min(100, 68 + tech.certifications.length * 7)],
    ["Readiness", readiness],
    ["Utilization", Math.max(50, 100 - Math.abs(72 - tech.workload))],
    ["Quality", tech.quality],
    ["Report Timeliness", tech.timeliness],
    ["Profitability", Math.round((tech.billingRate - tech.hourlyCost) / tech.billingRate * 100)],
    ["Training Need", Math.max(18, 72 - tech.certifications.length * 6)]
  ];
  return `
    <section class="profile-layout">
      <aside class="panel">
        <div class="panel-head">
          <div>
            <h2>Technician Readiness</h2>
            <p>Supportive staffing view for coaching, credential planning, and dispatch fit.</p>
          </div>
        </div>
        <div class="profile-list">
          ${technicians.map(t => `
            <button class="profile-button ${t.id === tech.id ? "active" : ""}" type="button" data-tech="${t.id}">
              <strong>${t.name}</strong>
              <span class="subtle">${t.role} / ${t.branch}</span>
              <span class="badge ${toneForStatus(t.status)}">${t.status}</span>
            </button>
          `).join("")}
        </div>
      </aside>
      <div class="grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>${tech.name}</h2>
              <p>${tech.role} / ${tech.homeBase} / Supervisor: ${tech.supervisor}</p>
            </div>
            <span class="badge ${toneForScore(readiness)}">${readiness}% ready</span>
          </div>
          <div class="grid three">
            <div><span class="subtle">Phone</span><br><strong>${tech.phone}</strong></div>
            <div><span class="subtle">Vehicle</span><br><strong>${tech.vehicle}</strong></div>
            <div><span class="subtle">Assigned equipment</span><br><strong>${tech.equipment}</strong></div>
          </div>
          <hr style="border:0;border-top:1px solid var(--line);margin:16px 0;">
          <div class="pill-list">${tech.certifications.map(c => `<span class="badge info">${c}</span>`).join("")}</div>
        </section>
        ${renderTechnicianLocationPanel(tech)}
        <section class="score-grid">
          ${scores.map(([label, value]) => `
            <article class="score-card">
              <span class="subtle">${label} Score</span>
              <strong>${value}%</strong>
              <div class="progress ${label === "Training Need" ? "warn" : toneForScore(value)}"><span style="width:${value}%"></span></div>
            </article>
          `).join("")}
        </section>
        <section class="grid two">
          <div class="panel">
            <h2>Professional Development</h2>
            <div class="status-list">
              ${tech.trainingNeeds.map(n => `<div class="activity-row"><strong>${n}</strong><span class="subtle">Suggested next action, not a public ranking.</span></div>`).join("")}
            </div>
          </div>
          <div class="panel">
            <h2>Upcoming Assignments</h2>
            <div class="status-list">
              ${workOrders.filter(w => w.techId === tech.id).slice(0, 4).map(w => `<div class="activity-row"><strong>${w.id} / ${w.service}</strong><span class="subtle">${w.project} at ${w.requiredTime}</span></div>`).join("") || `<div class="empty-state">No upcoming assignments in sample data.</div>`}
            </div>
          </div>
        </section>
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
          <p>Manual entry, certificate upload placeholder, and verification URL field. Official ACI, WACEL, ICC, and DOT integrations are future work and should require permission.</p>
        </div>
      </div>
      <div class="kpi-strip">
        <div class="activity-row"><strong>1. Enter record</strong><span class="subtle">Technician, type, number, issuer, dates</span></div>
        <div class="activity-row"><strong>2. Upload certificate</strong><span class="subtle">Stored document placeholder for MVP</span></div>
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
  return `
    <section class="grid four">
      ${[
        ["Equipment items", equipment.length, "info"],
        ["Available", equipment.filter(e => e.status === "Available").length, "good"],
        ["Assigned / in use", equipment.filter(e => ["Assigned", "In use"].includes(e.status)).length, "neutral"],
        ["Issues", equipment.filter(e => toneForStatus(e.status) === "bad").length, "bad"]
      ].map(renderMetric).join("")}
    </section>
    ${renderTablePanel("Equipment Management", "Calibration, availability, assigned technician, project, condition, and maintenance status.", "equipmentTable", equipment, [
      ["id", "Equipment ID"],
      ["category", "Category"],
      ["manufacturer", "Manufacturer"],
      ["location", "Location"],
      ["assignedTech", "Assigned technician"],
      ["calibrationDue", "Calibration due"],
      ["condition", "Condition"],
      ["status", "Status"]
    ])}
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
        ["AI-style audit checks", 12, "info"]
      ].map(renderMetric).join("")}
    </section>
    ${renderTablePanel("Reports and QA/QC Review", "Checks for missing fields, expired certifications, calibration gaps, wrong references, out-of-range values, signatures, and late reports.", "reportsTable", reports, [
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
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Admin Settings</h2>
          <p>Configure branch operations, permissions, rates, templates, thresholds, map behavior, and future integrations.</p>
        </div>
      </div>
      <div class="grid four">
        ${settings.map(s => `<div class="activity-row"><strong>${s}</strong><span class="subtle">Configurable MVP placeholder</span></div>`).join("")}
      </div>
    </section>
    <section class="panel">
      <h2>Role Permissions</h2>
      <div class="grid three">
        ${Object.entries(roleAccess).map(([role, allowed]) => `<div class="activity-row"><strong>${role}</strong><span class="subtle">${allowed.map(id => pages.find(p => p[0] === id)[1]).join(", ")}</span></div>`).join("")}
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  const dispatchSelect = document.getElementById("dispatchWorkOrder");
  if (dispatchSelect) {
    dispatchSelect.addEventListener("change", event => {
      state.selectedWorkOrder = event.target.value;
      render();
    });
  }
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

document.addEventListener("click", event => {
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

document.getElementById("globalSearch").addEventListener("input", event => {
  renderGlobalResults(event.target.value);
});

document.getElementById("refreshButton").addEventListener("click", () => {
  document.getElementById("globalSearch").value = "";
  renderGlobalResults("");
  render();
});

setPage("command");
