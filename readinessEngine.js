(function initReadinessEngine(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTReadinessEngine = api;
})(typeof window !== "undefined" ? window : globalThis, function buildReadinessEngine() {
  const DEFAULT_TOMORROW_DATE = "2026-06-12";

  function toText(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function normalizeText(value) {
    return toText(value).trim();
  }

  function lower(value) {
    return normalizeText(value).toLowerCase();
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && normalizeText(item));
    if (value === null || value === undefined || value === "") return [];
    return toText(value).split(/[;,|]/).map(item => item.trim()).filter(Boolean);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function statusTone(status) {
    if (status === "Ready") return "good";
    if (status === "At Risk") return "warn";
    return "bad";
  }

  function normalizeServiceName(service) {
    const normalized = lower(service);
    if (normalized.includes("concrete pour") || normalized.includes("concrete testing")) return "Concrete Pour";
    if (normalized.includes("soil") || normalized.includes("compaction")) return "Soil Density";
    if (normalized.includes("masonry") || normalized.includes("grout")) return "Masonry Grout Inspection";
    if (normalized.includes("steel")) return "Structural Steel Inspection";
    if (normalized.includes("rebar") || normalized.includes("reinforced")) return "Rebar Inspection";
    if (normalized.includes("asphalt")) return "Asphalt Density";
    return normalizeText(service);
  }

  function getServiceRequirements(service, serviceRequirements = {}) {
    const direct = serviceRequirements[service];
    const normalized = serviceRequirements[normalizeServiceName(service)];
    return direct || normalized || {
      requiredCerts: [],
      requiredEquipment: [],
      clearance: ["Site access confirmed"],
      risks: ["Project information incomplete"]
    };
  }

  function getWorkOrderId(order = {}) {
    return order.id || order.work_order || order.workOrder || "Work order";
  }

  function getWorkOrderService(order = {}) {
    return order.service || order.service_type || order.serviceType || "";
  }

  function getTechnicianId(tech = {}) {
    return tech.id || tech.technician_id || tech.name || "";
  }

  function getAssignedTechnicianId(order = {}, context = {}) {
    const assignments = context.assignments || {};
    const id = getWorkOrderId(order);
    return assignments[id] ?? order.assignedTechId ?? order.assigned_technician_id ?? order.technicianId ?? order.technician_id ?? "";
  }

  function findTechnician(technicians = [], idOrName = "") {
    const needle = normalizeText(idOrName);
    if (!needle) return null;
    return technicians.find(tech => getTechnicianId(tech) === needle || tech.name === needle) || null;
  }

  function resolveTechnician(order = {}, context = {}) {
    if (context.assignedTech) return context.assignedTech;
    if (context.candidateTechId) return findTechnician(context.technicians || [], context.candidateTechId);
    return findTechnician(context.technicians || [], getAssignedTechnicianId(order, context));
  }

  function getCertificationRecordName(cert) {
    if (typeof cert === "string") return cert;
    return cert?.name || cert?.certification || cert?.type || "";
  }

  function getCertificationDays(cert) {
    if (typeof cert !== "object" || !cert) return null;
    const days = Number(cert.expiresIn ?? cert.daysRemaining ?? cert.days_until_expiration);
    return Number.isFinite(days) ? days : null;
  }

  function getCertificationRecords(tech = {}) {
    const records = [];
    asArray(tech.certs).forEach(cert => {
      if (typeof cert === "string") {
        records.push({ name: cert, expiresIn: null });
      } else if (cert) {
        records.push({ name: getCertificationRecordName(cert), expiresIn: getCertificationDays(cert) });
      }
    });
    asArray(tech.certifications).forEach(cert => {
      records.push({ name: getCertificationRecordName(cert), expiresIn: getCertificationDays(cert) });
    });
    return records.filter(record => record.name);
  }

  function findCertification(tech, required) {
    const requiredLower = lower(required);
    return getCertificationRecords(tech).find(cert => lower(cert.name) === requiredLower) || null;
  }

  function getRequiredCerts(order = {}, requirements = {}) {
    return asArray(order.requiredCerts?.length ? order.requiredCerts : order.required_certifications || order.requiredCertifications || requirements.requiredCerts);
  }

  function getRequiredEquipment(order = {}, requirements = {}) {
    return asArray(order.requiredEquipment?.length ? order.requiredEquipment : order.required_equipment || requirements.requiredEquipment);
  }

  function getRequiredClearance(order = {}, requirements = {}) {
    return asArray(order.requiredClearance?.length ? order.requiredClearance : order.required_clearance || requirements.requiredClearance || requirements.clearance);
  }

  function equipmentMatchesRequired(item = {}, required = "") {
    const req = lower(required);
    const category = lower(item.category || item.type);
    const name = lower(item.name || item.id);
    if (!req) return false;
    if (category === req) return true;
    return Boolean(category && req.includes(category)) || Boolean(name && name.includes(req));
  }

  function getEquipmentOptions(required, equipment = []) {
    return equipment.filter(item => equipmentMatchesRequired(item, required));
  }

  function isEquipmentUsable(item = {}) {
    const status = lower(item.status);
    const calibrationDays = Number(item.calibrationDays ?? item.calibration_days);
    const hasCalibration = Number.isFinite(calibrationDays);
    return !/out of service|unavailable|maintenance/.test(status) && (!hasCalibration || calibrationDays >= 0);
  }

  function getBestEquipment(required, equipment = []) {
    const options = getEquipmentOptions(required, equipment);
    return options.find(isEquipmentUsable) || options[0] || null;
  }

  function accessMatchesRequired(accessValue, required) {
    const access = lower(accessValue);
    const req = lower(required);
    if (!access || !req) return false;
    return access.includes(req)
      || (/(slump|air meter|thermometer|cylinder|molds|concrete)/.test(req) && access.includes("concrete field kit"))
      || (/troxler|gauge|nuclear/.test(req) && access.includes("troxler"));
  }

  function technicianHasEquipmentAccess(tech = {}, requiredEquipment = []) {
    const access = asArray(tech.equipmentAccess || tech.equipment_access || tech.equipment);
    return asArray(requiredEquipment).every(required => access.some(item => accessMatchesRequired(item, required)));
  }

  function includesAll(values, required) {
    const haystack = asArray(values).map(lower);
    return asArray(required).every(item => haystack.includes(lower(item)));
  }

  function dateCompare(a, b) {
    const left = new Date(`${a}T12:00:00`).getTime();
    const right = new Date(`${b}T12:00:00`).getTime();
    if (Number.isNaN(left) || Number.isNaN(right)) return null;
    return left - right;
  }

  function getPickupAssignedTechId(pickup = {}, context = {}) {
    const assignments = context.pickupAssignments || {};
    return assignments[pickup.id] ?? pickup.assignedPickupTechnicianId ?? pickup.assigned_pickup_technician_id ?? "";
  }

  function getPickupStatus(pickup = {}, context = {}) {
    if (["Picked Up", "Delivered to Lab"].includes(pickup.pickupStatus)) return pickup.pickupStatus;
    if (getPickupAssignedTechId(pickup, context)) return "Assigned";
    if (pickup.pickupStatus === "Overdue") return "Overdue";
    return pickup.pickupStatus || "Unassigned";
  }

  function evaluatePickupReadiness(pickup = {}, context = {}) {
    const tomorrowDate = context.tomorrowDate || DEFAULT_TOMORROW_DATE;
    const status = getPickupStatus(pickup, context);
    const assignedTech = findTechnician(context.technicians || [], getPickupAssignedTechId(pickup, context));
    const dueTomorrow = dateCompare(pickup.pickupDueDate || pickup.pickup_due_date, tomorrowDate) === 0;
    const overdue = status === "Overdue" || dateCompare(pickup.pickupDueDate || pickup.pickup_due_date, tomorrowDate) < 0;
    const issues = [];
    let readiness = "Ready";

    if (overdue && !assignedTech) {
      readiness = "Not Ready";
      issues.push("Field cylinders overdue for pickup.");
    } else if (dueTomorrow && !assignedTech) {
      readiness = "At Risk";
      issues.push("Field cylinders on site, pickup due tomorrow, no pickup technician assigned.");
    } else if (pickup.cylinderType === "Lab" && assignedTech && !assignedTech.returningToOffice) {
      readiness = "At Risk";
      issues.push("Lab-cured cylinders should return with assigned technician.");
    } else if (assignedTech && !assignedTech.returningToOffice) {
      readiness = "At Risk";
      issues.push("Pickup assigned to technician not returning to office.");
    } else if (assignedTech) {
      issues.push("Future pickup assigned.");
    } else {
      issues.push(pickup.readinessIssue || "Pickup needs review.");
    }

    return {
      readiness,
      tone: statusTone(readiness),
      status,
      assignedTech,
      dueTomorrow,
      overdue,
      issues
    };
  }

  function findPickupForWorkOrder(order = {}, pickups = []) {
    const id = getWorkOrderId(order);
    return pickups.find(pickup => pickup.workOrderId === id || pickup.work_order === id) || null;
  }

  function evaluateWorkOrderReadiness(order = {}, context = {}) {
    const technicians = context.technicians || [];
    const equipment = context.equipment || [];
    const requirements = getServiceRequirements(getWorkOrderService(order), context.serviceRequirements || {});
    const requiredCerts = getRequiredCerts(order, requirements);
    const requiredEquipment = getRequiredEquipment(order, requirements);
    const requiredClearance = getRequiredClearance(order, requirements);
    const assignedTech = resolveTechnician(order, { ...context, technicians });
    const blockers = [];
    const warnings = [];
    const equipmentPlan = [];
    const checks = [];

    if (!assignedTech) {
      blockers.push("No technician assigned.");
      checks.push({ type: "technician", status: "fail", detail: "No assigned technician found." });
    } else {
      const techStatus = normalizeText(assignedTech.status);
      if (["Unavailable", "Off Duty"].includes(techStatus) || /called out|unavailable|off duty/i.test(techStatus)) {
        blockers.push(`${assignedTech.name || "Assigned technician"} is ${techStatus.toLowerCase()} for tomorrow's work window.`);
        checks.push({ type: "technician", status: "fail", detail: techStatus });
      } else if (techStatus && techStatus !== "Available") {
        warnings.push(`${assignedTech.name || "Assigned technician"} is ${techStatus.toLowerCase()}; dispatcher should confirm release before dispatch.`);
        checks.push({ type: "technician", status: "warn", detail: techStatus });
      } else {
        checks.push({ type: "technician", status: "pass", detail: techStatus || "Available" });
      }

      requiredCerts.forEach(required => {
        const cert = findCertification(assignedTech, required);
        if (!cert) {
          blockers.push(`${assignedTech.name || "Assigned technician"} is missing ${required}.`);
          checks.push({ type: "certification", status: "fail", detail: required });
        } else if (cert.expiresIn !== null && cert.expiresIn < 0) {
          blockers.push(`${required} is expired for ${assignedTech.name || "assigned technician"}.`);
          checks.push({ type: "certification", status: "fail", detail: `${required}: ${cert.expiresIn} days` });
        } else if (cert.expiresIn !== null && cert.expiresIn <= 30) {
          warnings.push(`${required} expires in ${cert.expiresIn} days for ${assignedTech.name || "assigned technician"}.`);
          checks.push({ type: "certification", status: "warn", detail: `${required}: ${cert.expiresIn} days` });
        } else {
          checks.push({ type: "certification", status: "pass", detail: required });
        }
      });

      requiredClearance.forEach(clearance => {
        if (!includesAll(assignedTech.clearances || assignedTech.clearance, [clearance])) {
          blockers.push(`${assignedTech.name || "Assigned technician"} is missing ${clearance}.`);
          checks.push({ type: "clearance", status: "fail", detail: clearance });
        } else {
          checks.push({ type: "clearance", status: "pass", detail: clearance });
        }
      });

      if (context.requireTechnicianEquipmentAccess && !technicianHasEquipmentAccess(assignedTech, requiredEquipment)) {
        blockers.push(`${assignedTech.name || "Assigned technician"} lacks access to required equipment: ${requiredEquipment.join(", ")}.`);
        checks.push({ type: "technician-equipment-access", status: "fail", detail: requiredEquipment.join(", ") });
      }
    }

    requiredEquipment.forEach(required => {
      const item = getBestEquipment(required, equipment);
      if (!item) {
        blockers.push(`No ${required} is listed in the local equipment roster.`);
        checks.push({ type: "equipment", status: "fail", detail: required });
        return;
      }
      equipmentPlan.push(item);
      const calibrationDays = Number(item.calibrationDays ?? item.calibration_days);
      if (["Out of service", "Unavailable"].includes(item.status)) {
        blockers.push(`${item.name || item.id || required} is ${lower(item.status)}.`);
        checks.push({ type: "equipment", status: "fail", detail: `${item.name || item.id}: ${item.status}` });
      } else {
        if (Number.isFinite(calibrationDays) && calibrationDays < 0) {
          blockers.push(`${item.name || item.id || required} calibration expired ${Math.abs(calibrationDays)} days ago.`);
          checks.push({ type: "equipment-calibration", status: "fail", detail: `${item.name || item.id}: ${calibrationDays} days` });
        } else if (Number.isFinite(calibrationDays) && calibrationDays <= 30) {
          warnings.push(`${item.name || item.id || required} calibration expires in ${calibrationDays} days.`);
          checks.push({ type: "equipment-calibration", status: "warn", detail: `${item.name || item.id}: ${calibrationDays} days` });
        } else {
          checks.push({ type: "equipment", status: "pass", detail: item.name || item.id || required });
        }
        if (item.status === "Limited/shared") {
          warnings.push(`${item.name || item.id || required} is limited/shared and needs dispatch confirmation.`);
          checks.push({ type: "equipment-availability", status: "warn", detail: item.name || item.id || required });
        }
      }
    });

    if (order.scheduleWarning) {
      warnings.push(order.scheduleWarning);
      checks.push({ type: "schedule", status: "warn", detail: order.scheduleWarning });
    }

    const pickup = context.pickup || findPickupForWorkOrder(order, context.pickups || []);
    if (pickup) {
      const pickupReadiness = evaluatePickupReadiness(pickup, { ...context, technicians });
      if (pickupReadiness.readiness === "Not Ready") blockers.push(...pickupReadiness.issues);
      if (pickupReadiness.readiness === "At Risk") warnings.push(...pickupReadiness.issues);
      checks.push({ type: "pickup", status: pickupReadiness.readiness === "Ready" ? "pass" : pickupReadiness.readiness === "At Risk" ? "warn" : "fail", detail: pickupReadiness.issues[0] });
    }

    const status = blockers.length ? "Not Ready" : warnings.length ? "At Risk" : "Ready";
    return {
      status,
      tone: statusTone(status),
      assignedTech,
      requirements,
      requiredCerts,
      requiredEquipment,
      requiredClearance,
      blockers,
      warnings,
      equipmentPlan,
      checks,
      sourceFacts: {
        workOrderId: getWorkOrderId(order),
        service: getWorkOrderService(order),
        assignedTechnician: assignedTech?.name || "",
        requiredCerts,
        requiredEquipment,
        requiredClearance,
        equipmentPlan: equipmentPlan.map(item => item.name || item.id),
        pickupId: pickup?.id || ""
      },
      reasons: blockers.length || warnings.length ? [...blockers, ...warnings] : ["Assigned technician, required certifications, equipment, calibration, and schedule are ready."]
    };
  }

  function getCoverageImpactForTechnician(tech = {}, targetOrder = {}, context = {}) {
    const assignedOrder = (context.workOrders || []).find(order => {
      if (getWorkOrderId(order) === getWorkOrderId(targetOrder)) return false;
      return getAssignedTechnicianId(order, context) === getTechnicianId(tech);
    });

    if (!assignedOrder) {
      return {
        label: "No new gap",
        tone: "good",
        detail: tech.cascadingImpact || "No scheduled job breaks if this technician is moved.",
        penalty: 0,
        createsReadinessGap: false
      };
    }

    const currentReadiness = evaluateWorkOrderReadiness(assignedOrder, context);
    const createsReadyGap = currentReadiness.status === "Ready";
    return {
      label: createsReadyGap ? "Creates coverage gap" : "Worsens existing risk",
      tone: createsReadyGap ? "warn" : "bad",
      detail: `${getWorkOrderId(assignedOrder)} / ${assignedOrder.project || "assigned work"} would lose ${tech.name || "this technician"}. ${tech.cascadingImpact || ""}`.trim(),
      penalty: createsReadyGap ? 16 : 10,
      createsReadinessGap: true,
      affectedWorkOrderId: getWorkOrderId(assignedOrder),
      affectedReadiness: currentReadiness.status
    };
  }

  function parseDistancePenalty(distanceValue) {
    const distance = parseInt(distanceValue, 10);
    return Number.isFinite(distance) && distance > 40 ? 10 : 0;
  }

  function createCoverageCandidates(order = {}, context = {}) {
    const technicians = context.technicians || [];
    return technicians.map(tech => {
      const evaluation = evaluateWorkOrderReadiness(order, {
        ...context,
        candidateTechId: getTechnicianId(tech),
        requireTechnicianEquipmentAccess: true
      });
      const clearanceMatch = evaluation.requiredClearance.every(clearance => includesAll(tech.clearances || tech.clearance, [clearance]));
      const equipmentAccess = technicianHasEquipmentAccess(tech, evaluation.requiredEquipment);
      const impact = getCoverageImpactForTechnician(tech, order, context);
      const sameOffice = lower(tech.branch || tech.office) === lower(context.preferredBranch || order.branch || "Springfield");
      const warningPenalty = evaluation.warnings.length * 8;
      const blockerPenalty = evaluation.blockers.length * 24;
      const distancePenalty = parseDistancePenalty(tech.distance);
      const score = Math.max(5, Math.min(99, 92
        + (sameOffice ? 4 : -4)
        + (clearanceMatch ? 4 : -18)
        + (equipmentAccess ? 3 : -8)
        - warningPenalty
        - blockerPenalty
        - distancePenalty
        - impact.penalty));
      const canAssign = evaluation.blockers.length === 0 && !impact.createsReadinessGap;
      return {
        tech,
        evaluation,
        requirements: evaluation.requirements,
        clearanceMatch,
        equipmentAccess,
        impact,
        score,
        sameOffice,
        canAssign,
        label: !canAssign && evaluation.blockers.length ? "Not qualified"
          : !canAssign ? "Creates downstream gap"
            : evaluation.warnings.length ? "Coverage with warning"
              : "Direct match",
        sourceFacts: {
          workOrderId: getWorkOrderId(order),
          technicianId: getTechnicianId(tech),
          score,
          blockers: evaluation.blockers,
          warnings: evaluation.warnings,
          clearanceMatch,
          equipmentAccess,
          cascadingImpact: impact.detail
        }
      };
    }).sort((a, b) => b.score - a.score || lower(a.tech.name).localeCompare(lower(b.tech.name)));
  }

  function summarizeSchedule(workOrders = [], context = {}) {
    const jobs = workOrders.map(order => {
      const readiness = evaluateWorkOrderReadiness(order, context);
      return {
        order,
        readiness,
        blocker: readiness.blockers[0] || readiness.warnings[0] || ""
      };
    });
    const ready = jobs.filter(job => job.readiness.status === "Ready").length;
    const atRisk = jobs.filter(job => job.readiness.status === "At Risk").length;
    const notReady = jobs.filter(job => job.readiness.status === "Not Ready").length;
    const total = jobs.length;
    return {
      jobs,
      ready,
      atRisk,
      notReady,
      total,
      score: Math.round(((ready + atRisk * 0.75) / Math.max(1, total)) * 100),
      status: notReady || atRisk ? "At Risk" : "Ready",
      tone: notReady || atRisk ? "warn" : "good"
    };
  }

  return {
    DEFAULT_TOMORROW_DATE,
    asArray,
    normalizeServiceName,
    getServiceRequirements,
    getCertificationRecords,
    findCertification,
    getBestEquipment,
    technicianHasEquipmentAccess,
    evaluatePickupReadiness,
    evaluateWorkOrderReadiness,
    getCoverageImpactForTechnician,
    createCoverageCandidates,
    summarizeSchedule
  };
});
