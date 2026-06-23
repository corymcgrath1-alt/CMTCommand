(function initOperationalImpact(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTOperationalImpact = api;
})(typeof window !== "undefined" ? window : globalThis, function buildOperationalImpact() {
  function asArray(value) {
    if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && String(item).trim());
    if (value === null || value === undefined || value === "") return [];
    return String(value).split(/[;,|]/).map(item => item.trim()).filter(Boolean);
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getGeneratedAt(context = {}) {
    return context.generatedAt || new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function getOrder(job) {
    return job?.order || job || {};
  }

  function getReadiness(job) {
    return job?.readiness || job?.readinessEvaluation || {};
  }

  function getOrderId(job) {
    const order = getOrder(job);
    return order.id || order.work_order || order.workOrder || "Work order";
  }

  function getService(job) {
    const order = getOrder(job);
    return order.service || order.service_type || order.serviceType || "Unmapped service";
  }

  function getLocation(job) {
    const order = getOrder(job);
    return order.location || order.region || order.site || "";
  }

  function getRequiredCerts(job) {
    const order = getOrder(job);
    const readiness = getReadiness(job);
    return asArray(readiness.requiredCerts?.length ? readiness.requiredCerts : order.requiredCerts || order.required_certifications || order.requiredCertifications);
  }

  function getRequiredEquipment(job) {
    const order = getOrder(job);
    const readiness = getReadiness(job);
    return asArray(readiness.requiredEquipment?.length ? readiness.requiredEquipment : order.requiredEquipment || order.required_equipment);
  }

  function getStatus(job) {
    return getReadiness(job).status || getOrder(job).readinessStatus || getOrder(job).status || "Needs review";
  }

  function getAssignedTech(job) {
    const readiness = getReadiness(job);
    const order = getOrder(job);
    return readiness.assignedTech || order.assignedTech || null;
  }

  function certNames(tech) {
    return asArray(tech?.certs).map(cert => typeof cert === "string" ? cert : cert.name).concat(asArray(tech?.certifications));
  }

  function isAvailableTech(tech) {
    return /available|open/i.test(`${tech?.status || ""} ${tech?.schedule || ""}`) && !/unavailable|off duty|called out/i.test(`${tech?.status || ""} ${tech?.schedule || ""}`);
  }

  function classifyIssue(issue, job = {}) {
    const text = normalizeText(issue).toLowerCase();
    const order = getOrder(job);
    if (!normalizeText(getLocation(job))) return "missing location";
    if (!normalizeText(getService(job)) || /unmapped service/i.test(getService(job))) return "missing service type";
    if (/no technician|unassigned|coverage|qualified replacement/i.test(text)) return "missing qualified technician";
    if (/unavailable|called out|off duty/i.test(text)) return "unavailable assigned technician";
    if (/missing .*cert|certification|qualified|expired .*technician|expires in .*days/i.test(text)) return "missing required certification";
    if (/calibration|expired .*days|expires in .*days|meter|gauge/i.test(text)) return "expired or soon-expiring calibration";
    if (/no .* listed|missing equipment|out of service|equipment|slump|thermometer|molds|kit/i.test(text)) return "missing required equipment";
    if (/schedule|shared|conflict|window/i.test(text) || order.scheduleWarning) return "schedule conflict";
    if (getStatus(job) === "Not Ready") return "open not-ready work order";
    return "readiness blocker";
  }

  function severityForIssue(type, issue = "") {
    if (/missing qualified|unavailable|expired|missing required equipment|open not-ready/i.test(type)) return "High";
    if (/soon-expiring|schedule|missing location|missing service/i.test(type) || /expires in|shared|warning/i.test(issue)) return "Medium";
    return "Low";
  }

  function pushIssue(collection, issue) {
    collection.items.push(issue);
    collection.byType[issue.type] = (collection.byType[issue.type] || 0) + 1;
    collection.bySeverity[issue.severity] = (collection.bySeverity[issue.severity] || 0) + 1;
  }

  function calculateIssuesCaught(workOrders = [], equipment = [], technicians = [], decisionLog = []) {
    const issues = { items: [], byType: {}, bySeverity: {}, sourceDetails: [] };
    const jobs = asArray(workOrders);

    jobs.forEach(job => {
      const order = getOrder(job);
      const readiness = getReadiness(job);
      const id = getOrderId(job);
      const blockers = asArray(readiness.blockers);
      const warnings = asArray(readiness.warnings);
      const status = getStatus(job);

      [...blockers, ...warnings].forEach(reason => {
        const type = classifyIssue(reason, job);
        const severity = blockers.includes(reason) ? "High" : severityForIssue(type, reason);
        pushIssue(issues, {
          type,
          severity,
          workOrderId: id,
          service: getService(job),
          reason,
          source: `${id}: ${reason}`
        });
      });

      if (!normalizeText(getLocation(job))) {
        pushIssue(issues, { type: "missing location", severity: "Medium", workOrderId: id, service: getService(job), reason: "Location or region is missing.", source: `${id}: location` });
      }
      if (!normalizeText(getService(job))) {
        pushIssue(issues, { type: "missing service type", severity: "Medium", workOrderId: id, service: "Unknown", reason: "Service type is missing.", source: `${id}: service` });
      }
      if (status === "Not Ready" && !blockers.length) {
        pushIssue(issues, { type: "open not-ready work order", severity: "High", workOrderId: id, service: getService(job), reason: `${id} is still Not Ready.`, source: `${id}: status` });
      }
      if (order.scheduleWarning && !warnings.some(warning => warning === order.scheduleWarning)) {
        pushIssue(issues, { type: "schedule conflict", severity: "Medium", workOrderId: id, service: getService(job), reason: order.scheduleWarning, source: `${id}: scheduleWarning` });
      }
    });

    asArray(equipment).forEach(item => {
      const status = normalizeText(item.status);
      const calibrationDays = Number(item.calibrationDays);
      const hasNumericCalibration = Number.isFinite(calibrationDays);
      if (/out of service|maintenance/i.test(status) || (hasNumericCalibration && calibrationDays < 0)) {
        pushIssue(issues, {
          type: "expired or soon-expiring calibration",
          severity: "High",
          workOrderId: item.assignedProject || item.assignedWorkOrder || "Equipment roster",
          service: item.category || item.type || "Equipment",
          reason: `${item.name || item.id || "Equipment"} is ${status || `calibration ${calibrationDays} days`}.`,
          source: `${item.id || item.name}: calibration/status`
        });
      } else if (hasNumericCalibration && calibrationDays <= 30) {
        pushIssue(issues, {
          type: "expired or soon-expiring calibration",
          severity: "Medium",
          workOrderId: item.assignedProject || item.assignedWorkOrder || "Equipment roster",
          service: item.category || item.type || "Equipment",
          reason: `${item.name || item.id || "Equipment"} calibration expires in ${calibrationDays} days.`,
          source: `${item.id || item.name}: calibrationDays`
        });
      }
    });

    const decisionSources = asArray(decisionLog).map(entry => `${entry.id || "Decision"}: ${entry.statusAfterDecision || entry.impactLanguage || entry.reason || "Decision recorded"}`);
    issues.sourceDetails = [
      ...issues.items.map(item => item.source),
      ...decisionSources,
      `Technicians reviewed: ${asArray(technicians).length}`,
      `Equipment items reviewed: ${asArray(equipment).length}`
    ];

    return {
      totalIssuesCaught: issues.items.length,
      byType: issues.byType,
      bySeverity: issues.bySeverity,
      items: issues.items,
      sourceDetails: issues.sourceDetails
    };
  }

  function estimateReviewTimeSaved(snapshot = {}) {
    const totalJobs = Number(snapshot.totalJobsReviewed || snapshot.totalJobs || 0);
    const riskyJobs = Number(snapshot.atRiskCount || 0) + Number(snapshot.notReadyCount || 0);
    const issues = Number(snapshot.issuesCaughtBeforeTomorrow || snapshot.totalIssuesCaught || 0);
    const manualReviewEstimateMinutes = (totalJobs * 5) + (riskyJobs * 3) + (issues * 2);
    const cmtCommandReviewEstimateLow = Math.ceil(manualReviewEstimateMinutes * 0.3);
    const cmtCommandReviewEstimateHigh = Math.ceil(manualReviewEstimateMinutes * 0.4);
    const savedMinutesLow = Math.max(0, manualReviewEstimateMinutes - cmtCommandReviewEstimateHigh);
    const savedMinutesHigh = Math.max(savedMinutesLow, manualReviewEstimateMinutes - cmtCommandReviewEstimateLow);
    return {
      manualReviewEstimateMinutes,
      cmtCommandReviewEstimateMinutes: `${cmtCommandReviewEstimateLow}-${cmtCommandReviewEstimateHigh}`,
      savedMinutesLow,
      savedMinutesHigh,
      formulaDescription: `Manual review estimate = ${totalJobs} scheduled jobs x 5 min + ${riskyJobs} not-ready/at-risk jobs x 3 min + ${issues} blockers x 2 min. CMTCommand review estimate = 30-40% of manual review time.`,
      sourceDetails: {
        "Scheduled jobs": totalJobs,
        "Not-ready or at-risk jobs": riskyJobs,
        "Issues caught": issues,
        "Manual estimate minutes": manualReviewEstimateMinutes,
        "CMTCommand estimate minutes": `${cmtCommandReviewEstimateLow}-${cmtCommandReviewEstimateHigh}`
      }
    };
  }

  function summarizeByType(items, typePattern) {
    return items.filter(item => typePattern.test(item.type));
  }

  function findRepeatFailurePatterns(workOrders = [], equipment = [], technicians = [], intakeSummary = {}, decisionLog = []) {
    const issues = calculateIssuesCaught(workOrders, equipment, technicians, decisionLog);
    const patterns = [];
    const jobs = asArray(workOrders);
    const certCoverageIssues = summarizeByType(issues.items, /certification|qualified technician|unavailable assigned technician/);
    const affectedByCert = [...new Set(certCoverageIssues.map(item => item.workOrderId))].filter(Boolean);
    if (certCoverageIssues.length) {
      patterns.push({
        title: "Certification and coverage gaps are the main readiness constraint",
        severity: certCoverageIssues.some(item => item.severity === "High") ? "High" : "Medium",
        count: certCoverageIssues.length,
        affectedWorkOrders: affectedByCert,
        explanation: "Readiness is repeatedly constrained by technician availability, qualification fit, or certification coverage.",
        recommendedFix: "Build a backup coverage map by service type and keep certification mapping current before dispatch is finalized.",
        sourceDetails: certCoverageIssues.map(item => item.source)
      });
    }

    const equipmentIssues = summarizeByType(issues.items, /equipment|calibration/);
    if (equipmentIssues.length) {
      patterns.push({
        title: "Equipment readiness depends on earlier calibration visibility",
        severity: equipmentIssues.some(item => item.severity === "High") ? "High" : "Medium",
        count: equipmentIssues.length,
        affectedWorkOrders: [...new Set(equipmentIssues.map(item => item.workOrderId))].filter(Boolean),
        explanation: "Equipment or calibration status is appearing as a repeat readiness risk.",
        recommendedFix: "Review calibration and shared-equipment windows before assigning tomorrow's schedule.",
        sourceDetails: equipmentIssues.map(item => item.source)
      });
    }

    const missingFieldCounts = intakeSummary.missingFieldCounts || intakeSummary.sourceFields?.missingFieldCounts || intakeSummary.sourceFields?.["Missing field counts"] || {};
    const missingCount = Object.values(missingFieldCounts).reduce((sum, value) => sum + Number(value || 0), 0);
    const missingData = asArray(intakeSummary.missingData);
    if (missingCount || missingData.length || Number(intakeSummary.duplicateRiskCount || intakeSummary.sourceFields?.duplicateRiskCount || 0)) {
      patterns.push({
        title: "Pilot import data is missing fields needed for dispatch confidence",
        severity: missingCount > 3 ? "High" : "Medium",
        count: missingCount || missingData.length,
        affectedWorkOrders: [],
        explanation: "Required intake fields are incomplete, which limits source-backed readiness confidence.",
        recommendedFix: "Clean service type, scheduled date, location, required certification, and equipment mapping before relying on imported files.",
        sourceDetails: [`Missing fields: ${Object.keys(missingFieldCounts).join(", ") || missingData.join(", ") || "None listed"}`]
      });
    }

    const fallbackCounts = {};
    asArray(decisionLog).forEach(entry => {
      const name = entry.assignedTechnician || entry.recommendedTechnician;
      if (name) fallbackCounts[name] = (fallbackCounts[name] || 0) + 1;
    });
    const repeatedFallback = Object.entries(fallbackCounts).filter(([, count]) => count > 1);
    if (repeatedFallback.length) {
      patterns.push({
        title: "Fallback coverage is concentrating on too few people",
        severity: "Medium",
        count: repeatedFallback.reduce((sum, [, count]) => sum + count, 0),
        affectedWorkOrders: asArray(decisionLog).map(entry => entry.emergencyWorkOrder?.split(" / ")[0]).filter(Boolean),
        explanation: "Coverage decisions are leaning on the same technician more than once.",
        recommendedFix: "Develop at least one additional qualified backup for the affected service type.",
        sourceDetails: repeatedFallback.map(([name, count]) => `${name}: ${count} fallback decisions`)
      });
    }

    const notReadyJobs = jobs.filter(job => getStatus(job) === "Not Ready");
    if (notReadyJobs.length > 1) {
      patterns.push({
        title: "Next-day work still has open not-ready jobs",
        severity: "High",
        count: notReadyJobs.length,
        affectedWorkOrders: notReadyJobs.map(getOrderId),
        explanation: "More than one scheduled job still needs a manager or dispatcher decision.",
        recommendedFix: "Close the highest-risk coverage blocker first, then review remaining unassigned or special-inspection work.",
        sourceDetails: notReadyJobs.map(job => `${getOrderId(job)}: ${getStatus(job)}`)
      });
    }

    return patterns
      .sort((a, b) => (a.severity === "High" ? 0 : 1) - (b.severity === "High" ? 0 : 1) || b.count - a.count)
      .slice(0, 5);
  }

  function serviceCoverageKey(job) {
    const service = getService(job);
    if (/concrete|rebar|reinforced/i.test(service) || getRequiredCerts(job).some(cert => /aci|reinforced/i.test(cert))) return "Concrete / reinforced concrete inspection coverage";
    if (/soil|density|compaction|nuclear/i.test(service)) return "Nuclear density gauge work";
    if (/steel|structural/i.test(service)) return "Special inspection coverage";
    return `${service} coverage`;
  }

  function techMeetsJob(tech, job) {
    if (!isAvailableTech(tech)) return false;
    const names = certNames(tech);
    const certOk = getRequiredCerts(job).every(cert => names.includes(cert));
    const clearances = asArray(tech.clearances);
    const clearanceReq = asArray(getReadiness(job).requiredClearance?.length ? getReadiness(job).requiredClearance : getOrder(job).requiredClearance);
    const clearanceOk = clearanceReq.every(clearance => clearances.includes(clearance));
    return certOk && clearanceOk;
  }

  function findCoverageBottlenecks(workOrders = [], technicians = []) {
    const jobs = asArray(workOrders);
    const techs = asArray(technicians);
    const serviceGroups = {};
    jobs.forEach(job => {
      const key = serviceCoverageKey(job);
      if (!serviceGroups[key]) serviceGroups[key] = [];
      serviceGroups[key].push(job);
    });

    return Object.entries(serviceGroups).map(([serviceType, serviceJobs]) => {
      const qualified = techs.filter(tech => serviceJobs.some(job => techMeetsJob(tech, job)));
      const riskyJobs = serviceJobs.filter(job => getStatus(job) !== "Ready");
      const oneQualifiedJobs = serviceJobs.filter(job => techs.filter(tech => techMeetsJob(tech, job)).length === 1);
      const noQualifiedJobs = serviceJobs.filter(job => techs.filter(tech => techMeetsJob(tech, job)).length === 0);
      const riskLevel = noQualifiedJobs.length || oneQualifiedJobs.length ? "High" : qualified.length <= serviceJobs.length ? "Medium" : "Low";
      return {
        title: `${serviceType}: ${qualified.length} available qualified ${qualified.length === 1 ? "tech" : "techs"}`,
        affectedServiceType: serviceType,
        availableQualifiedTechCount: qualified.length,
        requiredCoverageCount: serviceJobs.length,
        jobsNeedingCoverageCount: riskyJobs.length,
        riskLevel,
        recommendedAction: riskLevel === "High"
          ? "Create a named backup plan before tomorrow and expand the qualified bench for this service."
          : riskLevel === "Medium"
            ? "Confirm the backup technician and equipment plan before dispatch."
            : "Keep this bench mapped for future coverage decisions.",
        affectedWorkOrders: serviceJobs.map(getOrderId),
        sourceDetails: serviceJobs.map(job => `${getOrderId(job)} requires ${getRequiredCerts(job).join(", ") || "no mapped cert"} / status ${getStatus(job)}`)
      };
    }).sort((a, b) => (a.riskLevel === "High" ? 0 : a.riskLevel === "Medium" ? 1 : 2) - (b.riskLevel === "High" ? 0 : b.riskLevel === "Medium" ? 1 : 2));
  }

  function parseWarningField(warning) {
    const match = String(warning).match(/missing\s+(.+)$/i);
    return match ? match[1].trim() : "";
  }

  function calculateDataQualityScore(importRows = [], validationResults = {}, workOrders = []) {
    const rows = asArray(importRows);
    const missingColumns = asArray(validationResults.missingColumns);
    const rowWarnings = asArray(validationResults.rowWarnings);
    const duplicateWarnings = asArray(validationResults.duplicateWarnings);
    const missingFieldCounts = {};
    missingColumns.forEach(field => { missingFieldCounts[field] = (missingFieldCounts[field] || 0) + Math.max(1, rows.length); });
    rowWarnings.forEach(warning => {
      const field = parseWarningField(warning);
      if (field) missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
    });

    const fields = Object.keys(rows[0] || {});
    const hasScheduledDate = rows.length ? rows.every(row => normalizeText(row.scheduled_date || row.requested_start || row.start || row.date)) : true;
    const hasServiceType = rows.length ? rows.every(row => normalizeText(row.service_type || row.service || row.type)) : true;
    const hasLocation = rows.length ? rows.every(row => normalizeText(row.location || row.region || row.site)) : true;
    const hasCertMapping = rows.length ? rows.every(row => normalizeText(row.required_certifications || row.requiredCerts || row.certification || row.certifications)) : true;
    const hasEquipmentMapping = rows.length ? rows.every(row => normalizeText(row.required_equipment || row.requiredEquipment || row.equipment_id || row.equipment)) : true;
    const workOrderMappingGaps = asArray(workOrders).filter(job => !getRequiredCerts(job).length || !getRequiredEquipment(job).length).length;

    let score = 100;
    score -= missingColumns.length * 12;
    score -= rowWarnings.length * 8;
    score -= duplicateWarnings.length * 10;
    if (!hasScheduledDate) score -= 8;
    if (!hasServiceType) score -= 10;
    if (!hasLocation) score -= 10;
    if (!hasCertMapping) score -= 8;
    if (!hasEquipmentMapping) score -= 8;
    score -= Math.min(12, workOrderMappingGaps * 2);
    score = Math.max(0, Math.min(100, score));
    const gradeLabel = score >= 85 ? "Strong" : score >= 70 ? "Usable" : score >= 50 ? "Needs Cleanup" : "Not Ready";
    const recommendedCleanupActions = [
      missingColumns.length ? `Add missing required columns: ${missingColumns.join(", ")}` : "",
      rowWarnings.length ? "Fill blank required fields before using the import for dispatch decisions." : "",
      duplicateWarnings.length ? "Resolve duplicate risks so work is not counted twice." : "",
      !hasScheduledDate ? "Add valid scheduled dates or requested start times." : "",
      !hasServiceType ? "Add service type values." : "",
      !hasLocation ? "Add location or region values." : "",
      !hasCertMapping ? "Map required certifications." : "",
      !hasEquipmentMapping ? "Map required equipment." : ""
    ].filter(Boolean);

    return {
      score,
      gradeLabel,
      missingFieldCounts,
      duplicateRiskCount: duplicateWarnings.length,
      readinessDemoUsable: score >= 70,
      recommendedCleanupActions,
      sourceDetails: {
        "Rows reviewed": rows.length,
        "Fields found": fields,
        "Missing columns": missingColumns,
        "Row warnings": rowWarnings,
        "Duplicate warnings": duplicateWarnings,
        "Work order mapping gaps": workOrderMappingGaps
      }
    };
  }

  function mostCommonKey(counts = {}) {
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  }

  function statusCounts(jobs) {
    return {
      readyCount: jobs.filter(job => getStatus(job) === "Ready").length,
      atRiskCount: jobs.filter(job => getStatus(job) === "At Risk").length,
      notReadyCount: jobs.filter(job => getStatus(job) === "Not Ready").length
    };
  }

  function highestRiskJob(jobs) {
    const ranked = [...jobs].sort((a, b) => {
      const rank = status => status === "Not Ready" ? 0 : status === "At Risk" ? 1 : 2;
      const priority = job => /urgent|high/i.test(getOrder(job).priority || "") ? 0 : 1;
      return rank(getStatus(a)) - rank(getStatus(b)) || priority(a) - priority(b);
    });
    return ranked.find(job => getStatus(job) !== "Ready") || ranked[0] || {};
  }

  function buildPilotRoiCopy(snapshot) {
    return [
      "Pilot ROI Snapshot",
      snapshot.pilotRoiSummary,
      "",
      `Issues caught before tomorrow: ${snapshot.issuesCaughtBeforeTomorrow}`,
      `Estimated review time saved: ${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesLow}-${snapshot.estimatedReviewTimeSavedMinutes.savedMinutesHigh} min`,
      `Highest-risk work order: ${snapshot.highestRiskWorkOrder.id}`,
      `Most common blocker: ${snapshot.mostCommonBlockerType}`,
      `Recommended manager action: ${snapshot.recommendedManagerActions[0] || "Review readiness blockers before dispatch."}`,
      "",
      "How this was calculated:",
      snapshot.estimatedReviewTimeSavedMinutes.formulaDescription
    ].join("\n");
  }

  function buildReport(title, rows, formatter) {
    return [title, ...rows.map(formatter)].join("\n\n");
  }

  function createOperationalImpactSnapshot(context = {}) {
    const jobs = asArray(context.readinessJobs || context.jobs || context.workOrders);
    const workOrders = jobs.length ? jobs : asArray(context.workOrders);
    const equipment = asArray(context.equipment);
    const technicians = asArray(context.technicians);
    const decisionLog = asArray(context.decisionLog);
    const counts = context.counts || statusCounts(workOrders);
    const issues = calculateIssuesCaught(workOrders, equipment, technicians, decisionLog);
    const timeSaved = estimateReviewTimeSaved({
      totalJobsReviewed: workOrders.length,
      atRiskCount: counts.atRiskCount ?? counts.atRisk,
      notReadyCount: counts.notReadyCount ?? counts.notReady,
      issuesCaughtBeforeTomorrow: issues.totalIssuesCaught
    });
    const dataQualityScore = calculateDataQualityScore(context.importRows || [], context.validationResults || {}, workOrders);
    const patterns = findRepeatFailurePatterns(workOrders, equipment, technicians, dataQualityScore, decisionLog);
    const bottlenecks = findCoverageBottlenecks(workOrders, technicians);
    const riskJob = highestRiskJob(workOrders);
    const riskOrder = getOrder(riskJob);
    const highestRiskWorkOrder = {
      id: getOrderId(riskJob),
      service: getService(riskJob),
      status: getStatus(riskJob),
      reason: getReadiness(riskJob).blockers?.[0] || getReadiness(riskJob).warnings?.[0] || "No active readiness blocker.",
      recommendedFix: context.recommendedFix || (/TRD-104/i.test(getOrderId(riskJob)) ? "Approve Maria Lopez for coverage." : "Close the listed readiness blocker before dispatch.")
    };
    const trd104Decision = decisionLog.find(entry => /TRD-104/.test(entry.emergencyWorkOrder || entry.workOrder || "") && /approve|coverage/i.test(entry.decisionType || ""));
    const improvementText = trd104Decision
      ? `Decision impact: approving ${trd104Decision.assignedTechnician || "the recommended technician"} improved tomorrow readiness by resolving the TRD-104 coverage blocker. ${trd104Decision.impactLanguage || ""}`.trim()
      : "No coverage decision has been approved yet; the highest-risk blocker is still open.";
    const mostCommonBlockerType = mostCommonKey(issues.byType);
    const recommendedManagerActions = [
      highestRiskWorkOrder.status !== "Ready" ? highestRiskWorkOrder.recommendedFix : improvementText,
      patterns[0]?.recommendedFix,
      bottlenecks[0]?.recommendedAction,
      dataQualityScore.recommendedCleanupActions[0]
    ].filter(Boolean).slice(0, 4);
    const pilotRoiSummary = `CMTCommand reviewed ${workOrders.length} scheduled jobs and identified ${issues.totalIssuesCaught} readiness issues before tomorrow. The highest-risk issue is ${highestRiskWorkOrder.id}, which is ${highestRiskWorkOrder.status === "Ready" ? "now improved by the recorded coverage decision" : `blocked by ${highestRiskWorkOrder.reason}`}. Estimated dispatcher/manager review time saved is ${timeSaved.savedMinutesLow}-${timeSaved.savedMinutesHigh} minutes. ${improvementText}`;

    const snapshot = {
      generatedAt: getGeneratedAt(context),
      totalJobsReviewed: workOrders.length,
      readyCount: counts.readyCount ?? counts.ready ?? 0,
      atRiskCount: counts.atRiskCount ?? counts.atRisk ?? 0,
      notReadyCount: counts.notReadyCount ?? counts.notReady ?? 0,
      issuesCaughtBeforeTomorrow: issues.totalIssuesCaught,
      estimatedReviewTimeSavedMinutes: timeSaved,
      highestRiskWorkOrder,
      mostCommonBlockerType,
      repeatFailurePatterns: patterns,
      coverageBottlenecks: bottlenecks,
      equipmentRisks: issues.items.filter(item => /equipment|calibration/.test(item.type)),
      certificationRisks: issues.items.filter(item => /certification|qualified|unavailable/.test(item.type)),
      dataQualityScore,
      pilotRoiSummary,
      recommendedManagerActions,
      sourceDetails: {
        "Generated at": getGeneratedAt(context),
        "Work orders reviewed": workOrders.map(getOrderId),
        "Ready count": counts.readyCount ?? counts.ready ?? 0,
        "At risk count": counts.atRiskCount ?? counts.atRisk ?? 0,
        "Not ready count": counts.notReadyCount ?? counts.notReady ?? 0,
        "Issues by type": issues.byType,
        "Issues by severity": issues.bySeverity,
        "Time savings formula": timeSaved.formulaDescription,
        "Decision impact": improvementText,
        "Source issue records": issues.sourceDetails
      }
    };

    snapshot.operationalImpactCopyText = [
      "Operational Impact Summary",
      `Jobs reviewed: ${snapshot.totalJobsReviewed}`,
      `Issues caught before tomorrow: ${snapshot.issuesCaughtBeforeTomorrow}`,
      `Estimated review time saved: ${timeSaved.savedMinutesLow}-${timeSaved.savedMinutesHigh} min`,
      `Highest-risk work order: ${highestRiskWorkOrder.id} (${highestRiskWorkOrder.status})`,
      `Most common blocker: ${mostCommonBlockerType}`,
      `Recommended manager action: ${recommendedManagerActions[0] || "Review readiness blockers before dispatch."}`
    ].join("\n");
    snapshot.pilotRoiCopyText = buildPilotRoiCopy(snapshot);
    snapshot.repeatPatternCopyText = buildReport("Repeat Pattern Report", patterns, pattern => `${pattern.title}\nSeverity: ${pattern.severity}\nCount: ${pattern.count}\nAffected work orders: ${pattern.affectedWorkOrders.join(", ") || "None listed"}\nRecommended fix: ${pattern.recommendedFix}`);
    snapshot.coverageBottleneckCopyText = buildReport("Coverage Bottleneck Report", bottlenecks, bottleneck => `${bottleneck.affectedServiceType}\nQualified available techs: ${bottleneck.availableQualifiedTechCount}\nJobs needing coverage: ${bottleneck.jobsNeedingCoverageCount}\nRisk: ${bottleneck.riskLevel}\nRecommended action: ${bottleneck.recommendedAction}`);

    return snapshot;
  }

  return {
    createOperationalImpactSnapshot,
    calculateIssuesCaught,
    estimateReviewTimeSaved,
    findRepeatFailurePatterns,
    findCoverageBottlenecks,
    calculateDataQualityScore
  };
});
