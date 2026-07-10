(function initOperationalCompression(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTOperationalCompression = api;
})(typeof window !== "undefined" ? window : globalThis, function buildOperationalCompression() {
  function asArray(value) {
    if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && String(item).trim());
    if (value === null || value === undefined || value === "") return [];
    return String(value).split(/[;,|]/).map(item => item.trim()).filter(Boolean);
  }

  function cleanSentence(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  function labelValue(value, fallback = "Not provided") {
    if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((acc, key) => {
        acc[key] = stableValue(value[key]);
        return acc;
      }, {});
    }
    return value;
  }

  function sourceHash(value) {
    const text = JSON.stringify(stableValue(value));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `src-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function getGeneratedAt(context = {}) {
    return context.generatedAt || new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function inferSeverity(status, blockers = []) {
    if (/not ready|blocked|needs cleanup|high/i.test(status) || blockers.length) return "High";
    if (/at risk|warning|review|moderate|usable with/i.test(status)) return "Medium";
    if (/ready|approved|low/i.test(status)) return "Low";
    return "Medium";
  }

  function toneForSeverity(severity) {
    if (severity === "High") return "bad";
    if (severity === "Medium") return "warn";
    return "good";
  }

  function inferMissingData(blockers = [], explicit = []) {
    const inferred = blockers.filter(item => /missing|no technician|no .* listed|not provided|required/i.test(item));
    return [...new Set([...asArray(explicit), ...inferred])];
  }

  function estimateCharacterSavings(sourceFields, summaryText) {
    const originalDetailLength = JSON.stringify(stableValue(sourceFields || {})).length;
    const summaryLength = String(summaryText || "").length;
    const estimatedSavings = Math.max(0, originalDetailLength - summaryLength);
    const percent = originalDetailLength ? Math.round((estimatedSavings / originalDetailLength) * 100) : 0;
    return { originalDetailLength, summaryLength, estimatedSavings, percent };
  }

  function buildCopyText(summary, heading) {
    const lines = [
      heading || summary.headline,
      `Status: ${summary.status}`,
      `Summary: ${summary.summary}`,
      summary.keyFacts.length ? `Key facts:\n${summary.keyFacts.map(item => `- ${item}`).join("\n")}` : "",
      summary.blockers.length ? `Blockers:\n${summary.blockers.map(item => `- ${item}`).join("\n")}` : "Blockers: None listed.",
      summary.missingData.length ? `Missing data:\n${summary.missingData.map(item => `- ${item}`).join("\n")}` : "Missing data: None listed.",
      `Recommended action: ${summary.recommendedNextAction}`,
      summary.sourceRecords.length ? `Source records: ${summary.sourceRecords.join(", ")}` : "",
      `Generated: ${summary.generatedAt}`
    ];
    return lines.filter(Boolean).join("\n\n");
  }

  function makeSummary(input, context = {}) {
    const blockers = asArray(input.blockers);
    const missingData = inferMissingData(blockers, input.missingData);
    const sourceFields = input.sourceFields || {};
    const sourceRecords = asArray(input.sourceRecords);
    const hash = sourceHash({ sourceFields, sourceRecords });
    const status = input.status || "Needs review";
    const severity = input.severity || inferSeverity(status, blockers);
    const summary = {
      headline: input.headline,
      status,
      severity,
      tone: input.tone || toneForSeverity(severity),
      summary: cleanSentence(input.summary),
      keyFacts: asArray(input.keyFacts),
      blockers,
      missingData,
      recommendedNextAction: input.recommendedNextAction || "Review source details and confirm the next dispatch action.",
      sourceFields,
      sourceRecords,
      generatedAt: getGeneratedAt(context),
      sourceHash: hash,
      stale: Boolean(context.previousSourceHash && context.previousSourceHash !== hash),
      copyButtonLabel: input.copyButtonLabel || "",
      characterSavings: estimateCharacterSavings(sourceFields, input.summary)
    };
    summary.copyText = input.copyText || buildCopyText(summary, input.copyHeading);
    return summary;
  }

  function getCertNames(tech) {
    return asArray(tech?.certs).map(cert => typeof cert === "string" ? cert : cert.name).filter(Boolean);
  }

  function getWorkOrderId(workOrder) {
    return workOrder?.id || workOrder?.work_order || workOrder?.workOrder || "Work order";
  }

  function createWorkOrderReadinessPacket(workOrder = {}, context = {}) {
    const readiness = context.readiness || workOrder.readiness || {};
    const assignedTech = context.assignedTech || readiness.assignedTech || workOrder.assignedTech || {};
    const recommendedCandidate = context.recommendedCandidate || context.coverageCandidate || {};
    const recommendedTech = context.recommendedTech || recommendedCandidate.tech || {};
    const id = getWorkOrderId(workOrder);
    const requiredCerts = asArray(readiness.requiredCerts?.length ? readiness.requiredCerts : workOrder.requiredCerts || workOrder.required_certifications);
    const requiredEquipment = asArray(readiness.requiredEquipment?.length ? readiness.requiredEquipment : workOrder.requiredEquipment || workOrder.required_equipment);
    const requiredClearance = asArray(readiness.requiredClearance?.length ? readiness.requiredClearance : workOrder.requiredClearance);
    const blockers = asArray(readiness.blockers);
    const warnings = asArray(readiness.warnings);
    const status = readiness.status || workOrder.readinessStatus || workOrder.status || "Needs review";
    const assignedTechName = assignedTech.name || workOrder.technician || workOrder.assignedTechnician || "Unassigned";
    const recommendedTechName = recommendedTech.name || "";
    const firstIssue = blockers[0] || warnings[0] || "No active readiness gap.";
    const recommendedNextAction = context.recommendedAction
      || (status === "Ready" ? "Dispatch as planned and keep the source details with the handoff."
        : recommendedTechName ? `Approve ${recommendedTechName} for coverage.`
          : "Assign a qualified technician or resolve the listed readiness blocker before dispatch.");
    const whyThisMatters = status === "Ready"
      ? `${id} can proceed because the person, certification, equipment, clearance, and pickup checks are currently satisfied.`
      : `Scheduled does not mean ready. ${id} can fail tomorrow if this blocker is not resolved before dispatch.`;
    const sourceFields = {
      "Work order ID": id,
      "Project": workOrder.project,
      "Service type": workOrder.service || workOrder.service_type,
      "Location": workOrder.location || workOrder.region,
      "Scheduled time": workOrder.time || workOrder.requested_start || workOrder.requiredTime,
      "Priority": workOrder.priority,
      "Assigned technician": assignedTechName,
      "Required certifications": requiredCerts,
      "Required equipment": requiredEquipment,
      "Required clearance": requiredClearance,
      "Current blockers": blockers,
      "Warnings": warnings,
      "Recommended technician": recommendedTechName || "None selected",
      "Pickup obligation": context.pickup ? `${context.pickup.id} / ${context.pickup.pickupStatus}` : "None"
    };
    const keyFacts = [
      `${id} / ${workOrder.service || workOrder.service_type || "Service not provided"}`,
      `${workOrder.location || "Location not provided"} / ${workOrder.time || workOrder.requested_start || "Time not provided"}`,
      `Assigned technician: ${assignedTechName}`,
      `Required certs: ${labelValue(requiredCerts)}`,
      `Required equipment: ${labelValue(requiredEquipment)}`,
      `Why this matters: ${whyThisMatters}`
    ];
    return makeSummary({
      headline: `Readiness Packet: ${id}`,
      status,
      summary: `${id} is ${status} for ${workOrder.service || "tomorrow's work"} at ${workOrder.time || "the scheduled time"}. ${firstIssue} Recommended action: ${recommendedNextAction}`,
      keyFacts,
      blockers,
      missingData: context.missingData,
      recommendedNextAction,
      sourceFields,
      sourceRecords: [id, assignedTech.id, recommendedTech.id, context.pickup?.id].filter(Boolean),
      copyHeading: `PM Handoff: ${id} Readiness Packet`
    }, context);
  }

  function createTechnicianReadinessSummary(technician = {}, context = {}) {
    const blockers = asArray(context.blockers);
    const warnings = asArray(context.warnings);
    const status = context.status || technician.status || "Needs review";
    return makeSummary({
      headline: `Technician Readiness: ${technician.name || technician.id || "Technician"}`,
      status,
      summary: `${technician.name || "This technician"} is ${status}. ${blockers[0] || warnings[0] || "No blocking readiness issue is listed."}`,
      keyFacts: [
        `Branch: ${technician.branch || technician.location?.label || "Not provided"}`,
        `Certifications: ${labelValue(technician.certifications || getCertNames(technician))}`,
        `Current assignment: ${technician.currentAssignment || "None listed"}`,
        `Availability: ${technician.schedule || technician.status || "Not provided"}`
      ],
      blockers,
      missingData: context.missingData,
      recommendedNextAction: context.recommendedAction || "Confirm availability, certification, and assignment fit before dispatch.",
      sourceFields: {
        "Technician ID": technician.id,
        "Name": technician.name,
        "Status": technician.status,
        "Branch": technician.branch,
        "Certifications": technician.certifications || getCertNames(technician),
        "Clearances": technician.clearances,
        "Equipment access": technician.equipmentAccess || technician.equipment
      },
      sourceRecords: [technician.id || technician.name].filter(Boolean)
    }, context);
  }

  function createEquipmentReadinessSummary(equipment = {}, context = {}) {
    const blockers = asArray(context.blockers);
    const status = context.status || equipment.status || "Needs review";
    const calibration = equipment.calibrationDays !== undefined
      ? `${equipment.calibrationDays} days`
      : equipment.calibrationDue || "Not provided";
    return makeSummary({
      headline: `Equipment Readiness: ${equipment.name || equipment.id || "Equipment"}`,
      status,
      summary: `${equipment.name || equipment.id || "This equipment item"} is ${status}. Calibration: ${calibration}.`,
      keyFacts: [
        `Type: ${equipment.category || equipment.type || "Not provided"}`,
        `Location: ${equipment.location || "Not provided"}`,
        `Assigned to: ${equipment.assignedTech || equipment.assigned_to || "Unassigned"}`,
        `Calibration: ${calibration}`
      ],
      blockers,
      missingData: context.missingData,
      recommendedNextAction: context.recommendedAction || "Confirm calibration and availability before this item is assigned to tomorrow's work.",
      sourceFields: {
        "Equipment ID": equipment.id || equipment.equipment_id,
        "Type": equipment.category || equipment.type,
        "Status": equipment.status,
        "Calibration due": equipment.calibrationDue || equipment.calibration_due,
        "Calibration days": equipment.calibrationDays,
        "Location": equipment.location,
        "Assigned technician": equipment.assignedTech || equipment.assigned_to
      },
      sourceRecords: [equipment.id || equipment.equipment_id].filter(Boolean)
    }, context);
  }

  function readinessRank(job) {
    const status = job?.readiness?.status || job?.status || "";
    if (status === "Not Ready") return 0;
    if (status === "At Risk") return 1;
    if (status === "Ready") return 2;
    return 3;
  }

  function createTomorrowOpsBrief(workOrders = [], technicians = [], equipment = [], context = {}) {
    const jobs = context.jobs || workOrders.map(order => ({ order, readiness: order.readiness || {} }));
    const counts = context.counts || {};
    const total = counts.total ?? jobs.length;
    const ready = counts.ready ?? jobs.filter(job => (job.readiness?.status || job.status) === "Ready").length;
    const atRisk = counts.atRisk ?? jobs.filter(job => (job.readiness?.status || job.status) === "At Risk").length;
    const notReady = counts.notReady ?? jobs.filter(job => (job.readiness?.status || job.status) === "Not Ready").length;
    const sortedRiskJobs = [...jobs].sort((a, b) => readinessRank(a) - readinessRank(b));
    const issue = asArray(context.issues)[0] || sortedRiskJobs.find(job => readinessRank(job) < 2) || {};
    const issueOrder = issue.order || issue;
    const issueReason = issue.reason || issue.blocker || issue.readiness?.blockers?.[0] || issue.readiness?.warnings?.[0] || "No urgent blocker listed.";
    const actions = asArray(context.actions).map(action => typeof action === "string" ? action : action.title || action.detail).filter(Boolean);
    const coverage = context.recommendedCoverage || {};
    const coverageTech = coverage.candidate?.tech || coverage.tech || {};
    const coverageOrder = coverage.workOrder || {};
    const recommendedAction = coverageTech.name
      ? `Approve ${coverageTech.name} for ${getWorkOrderId(coverageOrder)} coverage.`
      : actions[0] || "Review the highest-risk job and close the first readiness blocker.";
    const latestDecision = context.latestDecision;
    const decisionChange = latestDecision
      ? `${latestDecision.emergencyWorkOrder?.split(" / ")[0] || "Latest decision"} changed from ${latestDecision.beforeStatus || "Pending"} to ${latestDecision.afterStatus || latestDecision.statusAfterDecision}.`
      : "No coverage decision has been approved yet.";
    const status = notReady ? "At Risk" : atRisk ? "At Risk" : "Ready";
    const sourceFields = {
      "Jobs scheduled": total,
      "Ready jobs": ready,
      "At risk jobs": atRisk,
      "Not ready jobs": notReady,
      "Highest-risk work order": getWorkOrderId(issueOrder),
      "Highest-risk blocker": issueReason,
      "Top actions": actions.slice(0, 3),
      "Recommended coverage": coverageTech.name ? `${coverageTech.name} for ${getWorkOrderId(coverageOrder)}` : "None selected",
      "Latest decision": latestDecision ? latestDecision.statusAfterDecision : "None",
      "Technicians reviewed": technicians.length,
      "Equipment items reviewed": equipment.length
    };
    return makeSummary({
      headline: "Tomorrow Ops Brief",
      status,
      summary: `${total} jobs scheduled. ${ready} ready, ${atRisk} at risk, ${notReady} not ready. The highest-risk blocker is ${getWorkOrderId(issueOrder)} because ${issueReason} Recommended action: ${recommendedAction} ${decisionChange}`,
      keyFacts: [
        `${total} jobs scheduled: ${ready} ready, ${atRisk} at risk, ${notReady} not ready`,
        `Most urgent issue: ${getWorkOrderId(issueOrder)} - ${issueReason}`,
        `Top actions: ${actions.slice(0, 3).join(" | ") || recommendedAction}`,
        `Coverage decision change: ${decisionChange}`
      ],
      blockers: sortedRiskJobs
        .filter(job => readinessRank(job) < 2)
        .slice(0, 4)
        .map(job => `${getWorkOrderId(job.order || job)}: ${job.readiness?.blockers?.[0] || job.readiness?.warnings?.[0] || "Needs review"}`),
      missingData: context.missingData,
      recommendedNextAction: recommendedAction,
      sourceFields,
      sourceRecords: jobs.map(job => getWorkOrderId(job.order || job)).filter(Boolean),
      copyHeading: "Tomorrow Ops Brief"
    }, context);
  }

  function createCoverageHandoffPacket(workOrder = {}, recommendedTech = {}, context = {}) {
    const candidate = context.candidate || (recommendedTech.tech ? recommendedTech : {});
    const tech = candidate.tech || recommendedTech || {};
    const currentReadiness = context.currentReadiness || context.readiness || {};
    const afterReadiness = context.afterReadiness || candidate.evaluation || {};
    const id = getWorkOrderId(workOrder);
    const requiredCerts = asArray(afterReadiness.requiredCerts?.length ? afterReadiness.requiredCerts : workOrder.requiredCerts);
    const techCerts = getCertNames(tech);
    const matchingCerts = requiredCerts.filter(cert => techCerts.includes(cert));
    const remainingRisks = asArray(afterReadiness.warnings);
    const blockers = asArray(afterReadiness.blockers);
    const beforeStatus = currentReadiness.status || "Not Ready";
    const afterStatus = afterReadiness.status || "Ready";
    const status = candidate.canAssign === false || blockers.length ? "Needs review" : "Ready for approval";
    const fitReasons = [
      matchingCerts.length ? `matching certifications (${matchingCerts.join(", ")})` : "",
      candidate.clearanceMatch ? "required clearance" : "",
      candidate.equipmentAccess ? "equipment access" : "",
      tech.distance ? `${tech.distance} ETA` : "",
      candidate.sameOffice ? "same-office fit" : tech.branch ? `${tech.branch} office fit` : "",
      candidate.impact?.label ? `cascading impact: ${candidate.impact.label}` : ""
    ].filter(Boolean);
    const sourceFields = {
      "Work order ID": id,
      "Service type": workOrder.service,
      "Required certifications": requiredCerts,
      "Recommended technician": tech.name,
      "Technician status": tech.status,
      "Technician certifications": techCerts,
      "Matching certifications": matchingCerts,
      "Required clearance": workOrder.requiredClearance || afterReadiness.requiredClearance,
      "Technician clearances": tech.clearances,
      "Equipment access": tech.equipmentAccess,
      "Distance / ETA": tech.distance,
      "Branch": tech.branch,
      "Cascading impact": candidate.impact?.detail || tech.cascadingImpact,
      "Remaining risks": remainingRisks,
      "Before status": beforeStatus,
      "After status": afterStatus
    };
    return makeSummary({
      headline: `Coverage Handoff: ${id}`,
      status,
      summary: `${tech.name || "The recommended technician"} is the strongest match for ${id} because ${fitReasons.join(", ") || "the readiness checks favor this assignment"}. Approval will move ${id} from ${beforeStatus} to ${afterStatus}${remainingRisks.length ? " with remaining risks noted." : "."}`,
      keyFacts: [
        `Recommended technician: ${tech.name || "Not selected"}`,
        `Matching certs: ${labelValue(matchingCerts)}`,
        `Availability: ${tech.schedule || tech.status || "Not provided"}`,
        `Office / distance: ${tech.branch || "Not provided"} / ${tech.distance || "Not provided"}`,
        `Equipment impact: ${candidate.equipmentAccess ? "Equipment access confirmed" : "Equipment plan needs review"}`,
        `Remaining risks: ${remainingRisks.length ? remainingRisks.join("; ") : "None after approval"}`
      ],
      blockers,
      missingData: context.missingData,
      recommendedNextAction: blockers.length ? "Resolve the remaining blocker before approval." : `Approve ${tech.name || "the recommended technician"} for ${id}.`,
      sourceFields,
      sourceRecords: [id, tech.id].filter(Boolean),
      copyHeading: `Coverage Handoff: ${id}`
    }, context);
  }

  function createDecisionSummary(decisionLogEntry = {}, context = {}) {
    const id = decisionLogEntry.id || "Decision";
    const workOrder = decisionLogEntry.emergencyWorkOrder?.split(" / ")[0] || decisionLogEntry.workOrder || "Work order";
    const assigned = decisionLogEntry.assignedTechnician || decisionLogEntry.partnerFirm || "Manager review";
    const beforeStatus = decisionLogEntry.beforeStatus || "Pending";
    const afterStatus = decisionLogEntry.afterStatus || decisionLogEntry.statusAfterDecision || "Pending";
    const checks = asArray(decisionLogEntry.readinessChecksUsed);
    const status = /pending|escalated|review/i.test(afterStatus) ? "Needs review" : "Approved";
    const sourceFields = {
      "Decision ID": id,
      "Work order": decisionLogEntry.emergencyWorkOrder || workOrder,
      "Decision type": decisionLogEntry.decisionType,
      "Before status": beforeStatus,
      "After status": afterStatus,
      "Assigned technician": decisionLogEntry.assignedTechnician,
      "Replacement technician": decisionLogEntry.replacementTechnician,
      "Partner firm": decisionLogEntry.partnerFirm,
      "Issue": decisionLogEntry.issue,
      "Recommended action": decisionLogEntry.recommendedAction,
      "Approved action": decisionLogEntry.approvedAction,
      "Reason": decisionLogEntry.reason,
      "Readiness checks used": checks,
      "Impact language": decisionLogEntry.impactLanguage,
      "Not ready before decision": decisionLogEntry.notReadyBeforeDecision,
      "Not ready after decision": decisionLogEntry.notReadyAfterDecision,
      "Equipment affected": decisionLogEntry.equipmentAffected,
      "Jobs affected": decisionLogEntry.jobsAffected,
      "Decision timestamp": decisionLogEntry.timestamp,
      "Approved by role": decisionLogEntry.role
    };
    return makeSummary({
      headline: `Decision Summary: ${workOrder}`,
      status,
      summary: /approve|assign|coverage/i.test(decisionLogEntry.decisionType || "")
        ? `${workOrder} coverage approved: ${assigned} assigned to resolve the readiness gap. Status changed from ${beforeStatus} to ${afterStatus}. Decision based on ${checks.length ? checks.join(", ") : "the recorded source fields"}.`
        : `${workOrder} decision recorded: ${decisionLogEntry.decisionType || "Manager review"}. Status changed from ${beforeStatus} to ${afterStatus}. Decision based on ${checks.length ? checks.join(", ") : "the recorded source fields"}.`,
      keyFacts: [
        `Before: ${beforeStatus}`,
        `After: ${afterStatus}`,
        `Decision: ${decisionLogEntry.decisionType || "Not provided"}`,
        `Approved action: ${decisionLogEntry.approvedAction || decisionLogEntry.statusAfterDecision || "Not provided"}`,
        `Reason: ${decisionLogEntry.reason || "Not provided"}`
      ],
      blockers: asArray(decisionLogEntry.issue),
      missingData: context.missingData,
      recommendedNextAction: context.recommendedAction || "Keep this summary with the decision log and use source details for audit questions.",
      sourceFields,
      sourceRecords: [id, workOrder].filter(Boolean),
      copyHeading: `Decision Summary: ${workOrder}`
    }, context);
  }

  function parseRowWarning(warning) {
    const match = String(warning).match(/^Row\s+(\d+):\s+missing\s+(.+)$/i);
    return match ? { row: Number(match[1]), field: match[2].trim() } : null;
  }

  function createPilotIntakeSummary(importRows = [], validationResults = {}, context = {}) {
    const rows = Array.isArray(importRows) ? importRows : [];
    const parseErrors = asArray(validationResults.parseErrors);
    const rowWarnings = asArray(validationResults.rowWarnings);
    const duplicateWarnings = asArray(validationResults.duplicateWarnings);
    const missingColumns = asArray(validationResults.missingColumns);
    if (parseErrors.length) {
      const label = context.label || "pilot rows";
      const repairActions = [
        "Fix the CSV syntax before applying this file.",
        "Check for unmatched quotes, broken rows, or an interrupted export.",
        "Upload the corrected CSV again from Pilot Setup."
      ];
      const summary = makeSummary({
        headline: "CSV Preview Blocked",
        status: "Blocked",
        severity: "High",
        tone: "bad",
        summary: `${label} preview is blocked by ${parseErrors.length} parse error${parseErrors.length === 1 ? "" : "s"}. No rows were accepted for local readiness review.`,
        keyFacts: [
          "Preview blocked before apply",
          `${parseErrors.length} parse error${parseErrors.length === 1 ? "" : "s"}`,
          `${rows.length} partial ${rows.length === 1 ? "row" : "rows"} held for diagnostics only`,
          "Good enough for readiness demo: No"
        ],
        blockers: parseErrors.map(error => `Parse error: ${error}`),
        missingData: ["valid CSV syntax"],
        recommendedNextAction: repairActions[0],
        sourceFields: {
          "Import label": label,
          "Preview status": "Blocked",
          "Accepted rows": 0,
          "Diagnostic partial rows": rows.length,
          "Parse errors": parseErrors
        },
        sourceRecords: [],
        copyHeading: "CSV Parse Repair Request",
        copyButtonLabel: "Copy Parse Error"
      }, context);
      summary.cleanupRequestText = [
        `CSV parse repair request for ${label}`,
        `The preview was blocked before apply. No rows were accepted for local readiness review.`,
        `Parse errors:\n${parseErrors.map(error => `- ${error}`).join("\n")}`,
        `Repair actions:\n${repairActions.map(action => `- ${action}`).join("\n")}`
      ].join("\n\n");
      return summary;
    }
    const missingRows = new Set();
    const missingFieldCounts = {};
    rowWarnings.forEach(warning => {
      const parsed = parseRowWarning(warning);
      if (!parsed) return;
      missingRows.add(parsed.row);
      missingFieldCounts[parsed.field] = (missingFieldCounts[parsed.field] || 0) + 1;
    });
    missingColumns.forEach(column => {
      missingFieldCounts[column] = (missingFieldCounts[column] || 0) + rows.length;
    });
    const mostCommonMissing = Object.entries(missingFieldCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
    const usableRows = Math.max(0, rows.length - missingRows.size);
    const goodEnoughForReadinessDemo = rows.length > 0 && missingColumns.length === 0 && usableRows >= Math.ceil(rows.length * 0.75);
    const status = missingColumns.length || missingRows.size ? "Needs cleanup" : duplicateWarnings.length ? "Usable with duplicate review" : "Ready for demo";
    const label = context.label || "pilot rows";
    const cleanupActions = [
      missingColumns.length ? `Add missing columns: ${missingColumns.join(", ")}` : "",
      missingRows.size ? `Fill required fields on ${missingRows.size} row${missingRows.size === 1 ? "" : "s"}` : "",
      duplicateWarnings.length ? `Review ${duplicateWarnings.length} duplicate risk${duplicateWarnings.length === 1 ? "" : "s"}` : "",
      mostCommonMissing !== "None" ? `Prioritize ${mostCommonMissing}` : "",
      goodEnoughForReadinessDemo ? "Use this file for a readiness demo after duplicate review." : "Clean the required fields before using this data for dispatch decisions."
    ].filter(Boolean);
    const sourceFields = {
      "Import label": label,
      "Rows imported": rows.length,
      "Usable rows": usableRows,
      "Rows missing required fields": missingRows.size,
      "Duplicate risks": duplicateWarnings.length,
      "Missing columns": missingColumns,
      "Most common missing field": mostCommonMissing,
      "Good enough for readiness demo": goodEnoughForReadinessDemo ? "Yes" : "No",
      "Validation warnings": rowWarnings,
      "Duplicate warnings": duplicateWarnings
    };
    const cleanupRequestText = [
      `Pilot cleanup request for ${label}`,
      `${rows.length} rows were imported. ${usableRows} are usable for readiness analysis. ${missingRows.size} need required-field cleanup and ${duplicateWarnings.length} have duplicate risk.`,
      mostCommonMissing !== "None" ? `Most common missing field: ${mostCommonMissing}.` : "No common missing field was found.",
      `Please provide the missing required values so tomorrow-readiness checks can be run from the source data.`,
      `Cleanup actions:\n${cleanupActions.map(action => `- ${action}`).join("\n")}`
    ].join("\n\n");
    const summary = makeSummary({
      headline: "Smart Intake Summary",
      status,
      summary: `${rows.length} ${label} imported. ${usableRows} are usable for readiness analysis. ${missingRows.size} need cleanup before dispatch decisions. Most common issue: ${mostCommonMissing}.`,
      keyFacts: [
        `${rows.length} rows imported`,
        `${usableRows} usable rows`,
        `${missingRows.size} rows missing required fields`,
        `${duplicateWarnings.length} duplicate risks`,
        `Good enough for readiness demo: ${goodEnoughForReadinessDemo ? "Yes" : "No"}`
      ],
      blockers: missingColumns.map(column => `Missing required column: ${column}`),
      missingData: [...missingColumns, ...Object.keys(missingFieldCounts)],
      recommendedNextAction: cleanupActions[0] || "Apply this import and keep source details available for review.",
      sourceFields,
      sourceRecords: rows.map((row, index) => row.work_order || row.equipment_id || row.name || row.firm_name || `Row ${index + 1}`),
      copyHeading: "Smart Intake Cleanup Request"
    }, context);
    summary.cleanupRequestText = cleanupRequestText;
    return summary;
  }

  return {
    createWorkOrderReadinessPacket,
    createTechnicianReadinessSummary,
    createEquipmentReadinessSummary,
    createTomorrowOpsBrief,
    createCoverageHandoffPacket,
    createDecisionSummary,
    createPilotIntakeSummary,
    buildCopyText,
    sourceHash
  };
});
