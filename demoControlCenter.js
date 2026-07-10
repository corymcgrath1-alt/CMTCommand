(function initDemoControlCenter(root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTDemoControlCenter = api;
})(typeof window !== "undefined" ? window : globalThis, function buildDemoControlCenter(root) {
  const REQUIRED_UTILITY_SPECS = [
    {
      id: "readinessEngine",
      label: "Readiness Engine utility",
      globalName: "CMTReadinessEngine",
      functions: ["evaluateWorkOrderReadiness", "createCoverageCandidates", "summarizeSchedule", "evaluatePickupReadiness"]
    },
    {
      id: "operationalCompression",
      label: "Operational Compression utility",
      globalName: "CMTOperationalCompression",
      functions: ["createTomorrowOpsBrief", "createWorkOrderReadinessPacket", "createCoverageHandoffPacket", "createDecisionSummary"]
    },
    {
      id: "operationalImpact",
      label: "Operational Impact utility",
      globalName: "CMTOperationalImpact",
      functions: ["createOperationalImpactSnapshot", "estimateReviewTimeSaved", "findRepeatFailurePatterns", "findCoverageBottlenecks"]
    },
    {
      id: "demoWalkthrough",
      label: "Pilot Story Mode utility",
      globalName: "CMTDemoWalkthrough",
      functions: ["getSteps", "createInitialState", "resetWalkthroughState", "createDemoRecap"]
    },
    {
      id: "pilotReadinessPack",
      label: "Pilot Readiness Pack utility",
      globalName: "CMTPilotReadinessPack",
      functions: ["createPilotMaterialsSummary", "getManagerEmailCopy", "getPilotDataRequestCopy", "getOnePageBusinessCaseCopy", "getDemoScorecardCopy"]
    },
    {
      id: "pilotIntakeSafety",
      label: "Pilot Intake Safety utility",
      globalName: "CMTPilotIntakeSafety",
      functions: ["parseCsv", "validateImport", "rowsToCsv", "appendTextElement", "isAllowedUrl"]
    }
  ];

  const COPY_MATERIAL_SPECS = [
    ["tomorrowOpsBrief", "Tomorrow Ops Brief copy"],
    ["workOrderReadinessPacket", "Work Order Readiness Packet copy"],
    ["coverageHandoff", "Coverage Handoff copy"],
    ["decisionSummary", "Decision Summary copy"],
    ["operationalImpactSummary", "Operational Impact Summary copy"],
    ["pilotRoiSnapshot", "Pilot ROI Snapshot copy"],
    ["demoRecap", "Demo Recap copy"],
    ["managerEmail", "Manager Email copy"],
    ["pilotDataRequest", "Pilot Data Request copy"],
    ["onePageBusinessCase", "One-Page Business Case copy"],
    ["postDemoFollowUp", "Post-Demo Follow-Up copy"],
    ["founderChecklist", "Founder Checklist copy"],
    ["demoScorecard", "Demo Scorecard copy"]
  ].map(([id, label]) => ({ id, label }));

  const PILOT_MATERIAL_SPECS = [
    ["summary", "Pilot Materials Summary"],
    ["founderChecklist", "Founder Demo Checklist"],
    ["qualificationQuestions", "Qualification Questions"],
    ["dataRequest", "Data Request"],
    ["successCriteria", "Success Criteria"],
    ["objectionHandling", "Objection Handling"],
    ["managerEmail", "Manager Email"],
    ["postDemoFollowUp", "Post-Demo Follow-Up"],
    ["onePageBusinessCase", "One-Page Business Case"],
    ["demoScorecard", "Demo Scorecard"]
  ].map(([id, label]) => ({ id, label }));

  const KNOWN_DEMO_STORAGE_KEYS = [
    "cmtcommand-demo-walkthrough",
    "cmtcommand-demo-control-checklist"
  ];

  const PRE_DEMO_CHECKLIST = [
    ["open-control-center", "Open Demo Control Center."],
    ["confirm-ready", "Confirm health status is Ready for Demo."],
    ["reset-story", "Reset demo story if needed."],
    ["set-ui-mode", "Set preferred UI mode."],
    ["open-tomorrow-readiness", "Open Tomorrow Readiness."],
    ["opening-line", "Start with \"Scheduled does not mean ready.\""],
    ["run-story-mode", "Run Pilot Story Mode."],
    ["pause-packet", "Pause on TRD-104 Readiness Packet."],
    ["approve-maria", "Approve Maria Lopez."],
    ["show-decision-log", "Show Decision Log."],
    ["show-impact", "Show Operational Impact."],
    ["open-pilot-materials", "Open Pilot Materials."],
    ["copy-follow-up", "Copy follow-up message after meeting."],
    ["record-objections", "Record buyer objections in notes."]
  ].map(([id, label]) => ({ id, label }));

  const KNOWN_LIMITATIONS = [
    "Static demo data only.",
    "Conservative estimated time savings, not exact ROI.",
    "No backend persistence.",
    "No live scheduling integration.",
    "No external AI.",
    "No CRM/email sending.",
    "No payroll/pricing/HR data required for pilot.",
    "Not a LIMS replacement.",
    "Not replacing scheduling in the first pilot.",
    "Pilot would begin with limited anonymized exports."
  ];

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && String(item).trim());
    if (value === null || value === undefined || value === "") return [];
    return String(value).split(/[;,|]/).map(item => item.trim()).filter(Boolean);
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function hasText(value) {
    return normalizeText(value).length > 0;
  }

  function getGeneratedAt(context = {}) {
    return context.generatedAt || new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function makeCheck(input) {
    return {
      id: input.id,
      label: input.label,
      status: input.status || "fail",
      severity: input.severity || "medium",
      summary: input.summary || "",
      detail: input.detail || "",
      recommendedFix: input.recommendedFix || "",
      sourceDetails: input.sourceDetails || {}
    };
  }

  function statusRank(status) {
    if (status === "fail") return 2;
    if (status === "warn") return 1;
    return 0;
  }

  function deriveSectionStatus(checks) {
    const worst = checks.reduce((rank, check) => Math.max(rank, statusRank(check.status)), 0);
    return worst === 2 ? "fail" : worst === 1 ? "warn" : "pass";
  }

  function createSection(id, label, summary, checks, extra = {}) {
    const status = deriveSectionStatus(checks);
    return {
      id,
      label,
      status,
      summary,
      checks,
      passingChecks: checks.filter(check => check.status === "pass").length,
      warningChecks: checks.filter(check => check.status === "warn").length,
      failingChecks: checks.filter(check => check.status === "fail").length,
      ...extra
    };
  }

  function resolveUtility(context = {}, spec) {
    const utilities = context.requiredUtilities || context.utilities || {};
    return utilities[spec.id] || utilities[spec.globalName] || root?.[spec.globalName];
  }

  function checkRequiredUtilities(context = {}) {
    const checks = REQUIRED_UTILITY_SPECS.map(spec => {
      const utility = resolveUtility(context, spec);
      const missing = spec.functions.filter(name => typeof utility?.[name] !== "function");
      return makeCheck({
        id: `utility-${spec.id}`,
        label: spec.label,
        status: utility && !missing.length ? "pass" : "fail",
        severity: utility ? "high" : "critical",
        summary: utility && !missing.length ? "Loaded with required functions." : "Missing required utility functions.",
        detail: missing.length ? `Missing: ${missing.join(", ")}` : `Found: ${spec.functions.join(", ")}`,
        recommendedFix: missing.length ? `Confirm ${spec.globalName} loads before app.js and exports the required functions.` : "No action needed.",
        sourceDetails: {
          globalName: spec.globalName,
          requiredFunctions: spec.functions,
          missingFunctions: missing
        }
      });
    });
    return createSection(
      "required-utilities",
      "Required Utility Scripts",
      "Confirms the local deterministic helper scripts loaded before the demo page.",
      checks
    );
  }

  function getOrderId(value) {
    const order = value?.order || value || {};
    return order.id || order.work_order || order.workOrder || "";
  }

  function getOrderStatus(order, readiness) {
    return readiness?.status || order?.readinessStatus || order?.status || "";
  }

  function getTRD104StoryContext(context = {}) {
    const direct = context.trd104 || {};
    const jobs = asArray(context.readinessJobs || context.jobs || context.workOrders);
    const job = direct.job || jobs.find(item => getOrderId(item) === "TRD-104") || {};
    const order = direct.order || job.order || job || context.workOrders?.find?.(item => getOrderId(item) === "TRD-104");
    const readiness = direct.readiness || job.readiness || job.readinessEvaluation || order?.readiness || {};
    const coverageCandidates = asArray(direct.coverageCandidates || context.coverageCandidates);
    const mariaCandidate = direct.mariaCandidate
      || coverageCandidates.find(item => item?.tech?.name === "Maria Lopez" || item?.name === "Maria Lopez")
      || null;
    const technicians = asArray(context.technicians);
    const maria = direct.maria || mariaCandidate?.tech || mariaCandidate || technicians.find(tech => tech.name === "Maria Lopez");
    const decisionLog = asArray(context.decisionLog);
    const trdDecision = decisionLog.find(entry => /TRD-104/i.test(`${entry.emergencyWorkOrder || ""} ${entry.workOrder || ""}`) && /approve|coverage/i.test(`${entry.decisionType || ""} ${entry.approvedAction || ""}`));
    return {
      order: order || null,
      readiness,
      mariaCandidate,
      maria,
      decisionLog,
      trdDecision,
      impactSnapshot: direct.impactSnapshot || context.impactSnapshot,
      canRecordDecisionLog: direct.canRecordDecisionLog ?? context.canRecordDecisionLog
    };
  }

  function certNames(tech) {
    return [
      ...asArray(tech?.certifications),
      ...asArray(tech?.certs).map(cert => typeof cert === "string" ? cert : cert.name)
    ].filter(Boolean);
  }

  function includesAll(haystack, needles) {
    const lower = asArray(haystack).map(item => item.toLowerCase());
    return asArray(needles).every(item => lower.some(value => value === item.toLowerCase()));
  }

  function hasEquipmentAccess(tech, requiredEquipment) {
    const access = asArray(tech?.equipmentAccess).join(" ").toLowerCase();
    const required = asArray(requiredEquipment);
    if (!required.length) return true;
    return required.every(item => {
      const lower = item.toLowerCase();
      return access.includes(lower)
        || (/(slump|air meter|thermometer|cylinder|molds)/i.test(lower) && access.includes("concrete field kit"));
    });
  }

  function checkTRD104Story(context = {}) {
    const story = getTRD104StoryContext(context);
    const order = story.order || {};
    const readiness = story.readiness || {};
    const blockers = asArray(readiness.blockers);
    const warnings = asArray(readiness.warnings);
    const reasons = asArray(readiness.reasons);
    const issueText = [...blockers, ...warnings, ...reasons, order.scope, order.status].join(" ");
    const status = getOrderStatus(order, readiness);
    const requiredCerts = asArray(readiness.requiredCerts?.length ? readiness.requiredCerts : order.requiredCerts || order.required_certifications);
    const requiredClearance = asArray(readiness.requiredClearance?.length ? readiness.requiredClearance : order.requiredClearance);
    const requiredEquipment = asArray(readiness.requiredEquipment?.length ? readiness.requiredEquipment : order.requiredEquipment);
    const maria = story.maria || {};
    const mariaAvailable = /available|open/i.test(`${maria.status || ""} ${maria.schedule || ""}`) && !/unavailable|off duty|called out/i.test(`${maria.status || ""} ${maria.schedule || ""}`);
    const mariaQualified = includesAll(certNames(maria), requiredCerts) && includesAll(maria.clearances, requiredClearance) && hasEquipmentAccess(maria, requiredEquipment) && mariaAvailable;
    const approvalAvailable = story.mariaCandidate?.canAssign === true || context.approveCoverageAvailable === true;
    const trdWasRiskBearing = !/^ready$/i.test(status) || /not ready|at risk|blocked/i.test(status) || /not ready|blocked/i.test(`${story.trdDecision?.beforeStatus || ""}`);
    const impact = story.impactSnapshot || {};
    const impactText = `${impact.pilotRoiSummary || ""} ${impact.highestRiskWorkOrder?.id || ""} ${impact.highestRiskWorkOrder?.status || ""}`;
    const impactShowsStory = /TRD-104/i.test(impact.highestRiskWorkOrder?.id || "") && !/^ready$/i.test(impact.highestRiskWorkOrder?.status || "")
      || Boolean(story.trdDecision && (/improved|resolved|coverage blocker/i.test(impactText) || !/TRD-104/i.test(impact.highestRiskWorkOrder?.id || "")));
    const checks = [
      makeCheck({
        id: "trd-104-exists",
        label: "TRD-104 work order exists",
        status: getOrderId(order) === "TRD-104" ? "pass" : "fail",
        severity: "critical",
        summary: getOrderId(order) === "TRD-104" ? "TRD-104 is available in demo data." : "TRD-104 is missing.",
        detail: getOrderId(order) || "No work order found.",
        recommendedFix: "Restore the TRD-104 demo work order.",
        sourceDetails: { workOrderId: getOrderId(order), project: order.project }
      }),
      makeCheck({
        id: "trd-104-risk-bearing",
        label: "TRD-104 starts risk-bearing",
        status: trdWasRiskBearing ? "pass" : "fail",
        severity: "high",
        summary: trdWasRiskBearing ? "TRD-104 is clearly Not Ready, At Risk, or has a recorded before-state." : "TRD-104 is not showing a risk-bearing setup.",
        detail: status || story.trdDecision?.beforeStatus || "No readiness status found.",
        recommendedFix: "Set TRD-104 to Not Ready before approval or keep the recorded before-status in the decision log.",
        sourceDetails: { status, beforeStatus: story.trdDecision?.beforeStatus }
      }),
      makeCheck({
        id: "trd-104-coverage-blocker",
        label: "Specific coverage/certification blocker exists",
        status: /coverage|qualified|certification|technician|unavailable|assigned/i.test(issueText) ? "pass" : "fail",
        severity: "high",
        summary: /coverage|qualified|certification|technician|unavailable|assigned/i.test(issueText) ? "The blocker explains the qualified coverage risk." : "The blocker is missing or too vague.",
        detail: issueText || "No blocker text found.",
        recommendedFix: "Restore blocker language about unavailable or unqualified coverage for the concrete pour.",
        sourceDetails: { blockers, warnings, reasons }
      }),
      makeCheck({
        id: "maria-lopez-exists",
        label: "Maria Lopez coverage option exists",
        status: maria.name === "Maria Lopez" ? "pass" : "fail",
        severity: "critical",
        summary: maria.name === "Maria Lopez" ? "Maria Lopez is available as a coverage option." : "Maria Lopez is missing.",
        detail: maria.name || "No Maria Lopez technician record found.",
        recommendedFix: "Restore Maria Lopez in the demo technician/candidate list.",
        sourceDetails: { technicianId: maria.id, status: maria.status, schedule: maria.schedule }
      }),
      makeCheck({
        id: "maria-lopez-qualified",
        label: "Maria Lopez matches requirements",
        status: mariaQualified ? "pass" : "fail",
        severity: "high",
        summary: mariaQualified ? "Maria has matching qualifications, clearance, equipment access, and availability." : "Maria does not satisfy the demo assignment rules.",
        detail: `Certs: ${certNames(maria).join(", ") || "none"}; clearances: ${asArray(maria.clearances).join(", ") || "none"}; status: ${maria.status || "unknown"}.`,
        recommendedFix: "Confirm Maria Lopez has ACI concrete certification, garage/site clearance, concrete field kit access, and open availability.",
        sourceDetails: { requiredCerts, requiredClearance, requiredEquipment, candidateCanAssign: story.mariaCandidate?.canAssign }
      }),
      makeCheck({
        id: "approve-coverage-available",
        label: "Approve Coverage action available",
        status: approvalAvailable ? "pass" : "fail",
        severity: "high",
        summary: approvalAvailable ? "Coverage approval can be shown." : "Coverage approval is not available.",
        detail: story.mariaCandidate?.canAssign === true ? "Maria candidate can be assigned." : "Approval availability must come from the readiness engine or rendered approval action.",
        recommendedFix: "Restore the Find Coverage action for TRD-104 and the Maria Lopez approval button.",
        sourceDetails: { canAssign: story.mariaCandidate?.canAssign, approveCoverageAvailable: context.approveCoverageAvailable }
      }),
      makeCheck({
        id: "decision-log-recordable",
        label: "Decision Log can record TRD-104",
        status: story.trdDecision || story.canRecordDecisionLog !== false ? "pass" : "warn",
        severity: "medium",
        summary: story.trdDecision ? "TRD-104 approval is already recorded." : "Decision Log is ready for a TRD-104 decision.",
        detail: story.trdDecision ? `${story.trdDecision.decisionType || "Decision"} / ${story.trdDecision.assignedTechnician || ""}` : "No TRD-104 decision recorded yet.",
        recommendedFix: story.trdDecision ? "No action needed." : "Run the approval step during the demo to create the local decision entry.",
        sourceDetails: { decisionCount: story.decisionLog.length, latestTRD104Decision: story.trdDecision?.id }
      }),
      makeCheck({
        id: "trd-104-impact-visible",
        label: "Operational Impact reflects TRD-104",
        status: impactShowsStory ? "pass" : "warn",
        severity: "medium",
        summary: impactShowsStory ? "Operational Impact identifies TRD-104 risk or improvement after approval." : "Operational Impact does not clearly reference the TRD-104 story.",
        detail: impact.highestRiskWorkOrder ? `${impact.highestRiskWorkOrder.id} / ${impact.highestRiskWorkOrder.status}` : "No impact snapshot found.",
        recommendedFix: "Regenerate the Operational Impact snapshot from the current readiness data and decision log.",
        sourceDetails: { highestRiskWorkOrder: impact.highestRiskWorkOrder, hasDecision: Boolean(story.trdDecision) }
      })
    ];
    return createSection(
      "trd-104-story",
      "TRD-104 Story Status",
      "Verifies that the centerpiece coverage-risk story is intact.",
      checks
    );
  }

  function getWalkthroughSteps(context = {}) {
    if (Array.isArray(context.walkthroughSteps)) return context.walkthroughSteps;
    const walkthrough = context.walkthrough || resolveUtility(context, REQUIRED_UTILITY_SPECS[2]);
    if (typeof walkthrough?.getSteps === "function") return walkthrough.getSteps();
    return asArray(walkthrough?.walkthroughSteps);
  }

  function hasCurrentTarget(doc, target) {
    if (!doc || typeof doc.querySelector !== "function" || !target) return false;
    try {
      return Boolean(doc.querySelector(`[data-demo-target="${String(target).replaceAll('"', '\\"')}"]`) || doc.getElementById?.(target));
    } catch (error) {
      return false;
    }
  }

  function checkWalkthroughTargets(documentRef, context = {}) {
    const doc = documentRef && typeof documentRef.querySelector === "function" ? documentRef : context.document;
    const reportContext = documentRef && typeof documentRef.querySelector !== "function" ? documentRef : context;
    const steps = getWalkthroughSteps(reportContext);
    const registry = reportContext.walkthroughTargetRegistry || {};
    const checks = steps.map((step, index) => {
      const target = step.target || "";
      const found = hasCurrentTarget(doc, target);
      const registered = Boolean(target && (registry[target] || step.page));
      const status = !target ? "fail" : found ? "pass" : registered ? "warn" : "fail";
      return makeCheck({
        id: `walkthrough-target-${step.id || index + 1}`,
        label: `Step ${index + 1}: ${step.title || step.id || "Untitled step"}`,
        status,
        severity: status === "fail" ? "high" : status === "warn" ? "low" : "low",
        summary: !target ? "No target configured." : found ? "Target is present in the current render." : registered ? "Target is expected after navigating to its step page." : "Target is not found and is not registered.",
        detail: target || "Missing target ID/data attribute.",
        recommendedFix: !target ? "Add a target ID/data attribute to the walkthrough step definition." : registered ? "Run Pilot Story Mode to verify this step renders on its target page." : `Restore an element with data-demo-target="${target}".`,
        sourceDetails: {
          stepId: step.id,
          stepNumber: index + 1,
          page: step.page,
          target,
          currentlyFound: found,
          registered: Boolean(registry[target]),
          expectedPage: registry[target]?.page || step.page
        }
      });
    });
    if (!steps.length) {
      checks.push(makeCheck({
        id: "walkthrough-steps-missing",
        label: "Pilot Story Mode step definitions",
        status: "fail",
        severity: "critical",
        summary: "No walkthrough steps were found.",
        detail: "CMTDemoWalkthrough.getSteps did not return steps.",
        recommendedFix: "Restore demoWalkthrough.js step definitions.",
        sourceDetails: {}
      }));
    }
    return createSection(
      "walkthrough-target-audit",
      "Walkthrough Target Audit",
      "Checks Pilot Story Mode targets and flags targets that are only visible after navigation as low-risk warnings.",
      checks,
      { steps }
    );
  }

  function normalizeMaterialMap(materials) {
    if (Array.isArray(materials)) {
      return materials.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
    }
    return materials || {};
  }

  function checkCopyMaterials(context = {}) {
    const materials = normalizeMaterialMap(context.copyMaterials);
    const checks = COPY_MATERIAL_SPECS.map(spec => {
      const material = materials[spec.id] || {};
      const text = typeof material === "string" ? material : material.text;
      const fallback = typeof material === "object" && Boolean(material.fallback);
      const empty = !hasText(text);
      return makeCheck({
        id: `copy-${spec.id}`,
        label: spec.label,
        status: empty ? "fail" : fallback ? "warn" : "pass",
        severity: empty ? "high" : fallback ? "medium" : "low",
        summary: empty ? "Missing or empty copy output." : fallback ? "Copy exists but is fallback/demo placeholder text." : "Copy output is available and non-empty.",
        detail: empty ? "No copy payload generated." : `${normalizeText(text).length} characters available.`,
        recommendedFix: empty ? `Restore the generator for ${spec.label}.` : fallback ? "Generate this material from the current demo state when possible." : "No action needed.",
        sourceDetails: {
          materialId: spec.id,
          length: normalizeText(text).length,
          fallback,
          source: material.source || "demo context"
        }
      });
    });
    return createSection(
      "copy-material-audit",
      "Copy Material Audit",
      "Verifies major copy/export payloads are present and non-empty.",
      checks,
      { materials: COPY_MATERIAL_SPECS }
    );
  }

  function getImpactSnapshot(context = {}) {
    if (context.impactSnapshot) return context.impactSnapshot;
    const impact = resolveUtility(context, REQUIRED_UTILITY_SPECS[1]);
    if (typeof impact?.createOperationalImpactSnapshot === "function") {
      return impact.createOperationalImpactSnapshot(context.impactContext || context);
    }
    return null;
  }

  function isNumeric(value) {
    return Number.isFinite(Number(value));
  }

  function checkOperationalImpact(context = {}) {
    const snapshot = getImpactSnapshot(context) || {};
    const time = snapshot.estimatedReviewTimeSavedMinutes || {};
    const improvementReflected = /improved|resolved|decision impact/i.test(`${snapshot.pilotRoiSummary || ""} ${snapshot.sourceDetails?.["Decision impact"] || ""}`);
    const highestRiskExists = hasText(snapshot.highestRiskWorkOrder?.id);
    const checks = [
      makeCheck({
        id: "impact-snapshot-generated",
        label: "Impact snapshot can be generated",
        status: snapshot && Object.keys(snapshot).length ? "pass" : "fail",
        severity: "critical",
        summary: snapshot && Object.keys(snapshot).length ? "Impact snapshot exists." : "Impact snapshot is missing.",
        detail: snapshot.generatedAt || "No generatedAt value.",
        recommendedFix: "Restore createOperationalImpactSnapshot and pass current readiness context.",
        sourceDetails: { generatedAt: snapshot.generatedAt }
      }),
      makeCheck({
        id: "impact-issues-numeric",
        label: "Issues caught count is numeric",
        status: isNumeric(snapshot.issuesCaughtBeforeTomorrow) ? "pass" : "fail",
        severity: "high",
        summary: isNumeric(snapshot.issuesCaughtBeforeTomorrow) ? "Issue count is numeric." : "Issue count is missing or not numeric.",
        detail: String(snapshot.issuesCaughtBeforeTomorrow ?? "missing"),
        recommendedFix: "Ensure issuesCaughtBeforeTomorrow is a number.",
        sourceDetails: { issuesCaughtBeforeTomorrow: snapshot.issuesCaughtBeforeTomorrow }
      }),
      makeCheck({
        id: "impact-time-savings-range",
        label: "Estimated review time saved has a conservative range",
        status: isNumeric(time.savedMinutesLow) && isNumeric(time.savedMinutesHigh) && Number(time.savedMinutesHigh) >= Number(time.savedMinutesLow) ? "pass" : "fail",
        severity: "high",
        summary: isNumeric(time.savedMinutesLow) && isNumeric(time.savedMinutesHigh) ? "Time savings range is numeric." : "Time savings range is missing.",
        detail: `${time.savedMinutesLow ?? "?"}-${time.savedMinutesHigh ?? "?"} minutes`,
        recommendedFix: "Return savedMinutesLow and savedMinutesHigh from estimateReviewTimeSaved.",
        sourceDetails: time
      }),
      makeCheck({
        id: "impact-highest-risk-or-improvement",
        label: "Highest-risk work order exists or improvement is reflected",
        status: highestRiskExists || improvementReflected ? "pass" : "fail",
        severity: "high",
        summary: highestRiskExists ? "Highest-risk work order is present." : improvementReflected ? "Post-approval improvement is reflected." : "No highest-risk or improvement story found.",
        detail: highestRiskExists ? `${snapshot.highestRiskWorkOrder.id} / ${snapshot.highestRiskWorkOrder.status}` : "No highest-risk work order.",
        recommendedFix: "Include highestRiskWorkOrder or explicit post-approval impact text.",
        sourceDetails: { highestRiskWorkOrder: snapshot.highestRiskWorkOrder, improvementReflected }
      }),
      makeCheck({
        id: "impact-repeat-patterns",
        label: "Repeat failure patterns exist",
        status: asArray(snapshot.repeatFailurePatterns).length ? "pass" : "warn",
        severity: "medium",
        summary: asArray(snapshot.repeatFailurePatterns).length ? "Repeat failure patterns are available." : "No repeat failure patterns found.",
        detail: `${asArray(snapshot.repeatFailurePatterns).length} patterns`,
        recommendedFix: "Verify readiness blockers, equipment, and intake data feed repeat pattern analysis.",
        sourceDetails: { count: asArray(snapshot.repeatFailurePatterns).length }
      }),
      makeCheck({
        id: "impact-coverage-bottlenecks",
        label: "Coverage bottlenecks exist or explain why none exist",
        status: asArray(snapshot.coverageBottlenecks).length ? "pass" : hasText(snapshot.coverageBottleneckCopyText) ? "warn" : "fail",
        severity: asArray(snapshot.coverageBottlenecks).length ? "low" : "medium",
        summary: asArray(snapshot.coverageBottlenecks).length ? "Coverage bottlenecks are available." : "No coverage bottleneck rows found.",
        detail: `${asArray(snapshot.coverageBottlenecks).length} bottlenecks`,
        recommendedFix: "Confirm technician qualification and availability data are included in the impact context.",
        sourceDetails: { count: asArray(snapshot.coverageBottlenecks).length }
      }),
      makeCheck({
        id: "impact-data-quality-score",
        label: "Data quality score exists",
        status: isNumeric(snapshot.dataQualityScore?.score) ? "pass" : "fail",
        severity: "medium",
        summary: isNumeric(snapshot.dataQualityScore?.score) ? "Data quality score is present." : "Data quality score is missing.",
        detail: `${snapshot.dataQualityScore?.score ?? "missing"} / 100`,
        recommendedFix: "Restore calculateDataQualityScore output on the impact snapshot.",
        sourceDetails: snapshot.dataQualityScore || {}
      }),
      makeCheck({
        id: "impact-pilot-roi-copy",
        label: "Pilot ROI Snapshot can be copied",
        status: hasText(snapshot.pilotRoiCopyText) ? "pass" : "fail",
        severity: "medium",
        summary: hasText(snapshot.pilotRoiCopyText) ? "Pilot ROI copy payload is available." : "Pilot ROI copy payload is missing.",
        detail: `${normalizeText(snapshot.pilotRoiCopyText).length} characters`,
        recommendedFix: "Restore pilotRoiCopyText on the impact snapshot.",
        sourceDetails: { length: normalizeText(snapshot.pilotRoiCopyText).length }
      }),
      makeCheck({
        id: "impact-source-details",
        label: "Source details exist for estimates",
        status: snapshot.sourceDetails && Object.keys(snapshot.sourceDetails).length ? "pass" : "fail",
        severity: "medium",
        summary: snapshot.sourceDetails && Object.keys(snapshot.sourceDetails).length ? "Source details are present." : "Source details are missing.",
        detail: `${Object.keys(snapshot.sourceDetails || {}).length} source detail fields`,
        recommendedFix: "Include sourceDetails with the formula, reviewed work orders, counts, and issue records.",
        sourceDetails: { keys: Object.keys(snapshot.sourceDetails || {}) }
      })
    ];
    return createSection(
      "operational-impact-qa",
      "Operational Impact QA",
      "Validates the local impact snapshot, conservative estimates, and source detail transparency.",
      checks,
      {
        metrics: {
          issuesCaughtBeforeTomorrow: snapshot.issuesCaughtBeforeTomorrow,
          estimatedReviewTimeSaved: isNumeric(time.savedMinutesLow) && isNumeric(time.savedMinutesHigh) ? `${time.savedMinutesLow}-${time.savedMinutesHigh} min` : "Missing",
          highestRiskWorkOrder: snapshot.highestRiskWorkOrder?.id || "Missing",
          dataQualityScore: isNumeric(snapshot.dataQualityScore?.score) ? `${snapshot.dataQualityScore.score}/100` : "Missing"
        },
        snapshot
      }
    );
  }

  function checkDecisionLogState(context = {}) {
    const decisionLog = asArray(context.decisionLog);
    const trdDecision = decisionLog.find(entry => /TRD-104/i.test(`${entry.emergencyWorkOrder || ""} ${entry.workOrder || ""}`));
    const checks = [
      makeCheck({
        id: "decision-log-array",
        label: "Decision Log state is readable",
        status: Array.isArray(context.decisionLog) ? "pass" : "warn",
        severity: "medium",
        summary: Array.isArray(context.decisionLog) ? "Decision Log is available as local state." : "Decision Log was not passed as an array.",
        detail: `${decisionLog.length} entries`,
        recommendedFix: "Pass the current emergencyDecisionLog array into the QA context.",
        sourceDetails: { decisionCount: decisionLog.length }
      }),
      makeCheck({
        id: "decision-log-trd104",
        label: "TRD-104 decision state is clear",
        status: trdDecision || context.canRecordDecisionLog !== false ? "pass" : "warn",
        severity: "medium",
        summary: trdDecision ? "TRD-104 approval is recorded." : "TRD-104 has not been approved yet in this local session.",
        detail: trdDecision ? `${trdDecision.decisionType || "Decision"} / ${trdDecision.assignedTechnician || ""}` : "Ready for approval during demo.",
        recommendedFix: trdDecision ? "No action needed." : "Approve Maria Lopez during the demo to populate the Decision Log.",
        sourceDetails: { trd104DecisionId: trdDecision?.id, decisionCount: decisionLog.length }
      }),
      makeCheck({
        id: "decision-log-size",
        label: "Decision Log is demo-sized",
        status: decisionLog.length <= 8 ? "pass" : "warn",
        severity: "low",
        summary: decisionLog.length <= 8 ? "Decision Log is compact." : "Decision Log has more entries than expected for a clean demo.",
        detail: `${decisionLog.length} entries`,
        recommendedFix: "Reset demo story state before a clean founder walkthrough.",
        sourceDetails: { decisionCount: decisionLog.length }
      })
    ];
    return createSection(
      "decision-log-state",
      "Decision Log State",
      "Checks whether the local Decision Log is readable and ready to capture the TRD-104 approval.",
      checks
    );
  }

  function getPilotMaterials(context = {}) {
    return normalizeMaterialMap(context.pilotMaterials);
  }

  function checkPilotMaterials(context = {}) {
    const pilotPack = context.pilotPack || resolveUtility(context, REQUIRED_UTILITY_SPECS[3]);
    const materials = getPilotMaterials(context);
    const materialBundleProvided = Object.keys(materials).length > 0;
    const pages = asArray(context.pages).map(page => Array.isArray(page) ? page[0] : page.id || page);
    const pageLabels = context.pageLabels || {};
    const checks = [
      makeCheck({
        id: "pilot-page-nav",
        label: "Pilot Materials page exists in navigation",
        status: pages.includes("pilotpack") || pageLabels.pilotpack ? "pass" : "fail",
        severity: "high",
        summary: pages.includes("pilotpack") || pageLabels.pilotpack ? "Pilot Materials is reachable." : "Pilot Materials page is missing from navigation.",
        detail: pageLabels.pilotpack || "pilotpack not found.",
        recommendedFix: "Restore the pilotpack page entry and page label.",
        sourceDetails: { pages, pageLabel: pageLabels.pilotpack }
      }),
      ...PILOT_MATERIAL_SPECS.map(spec => {
        const material = materials[spec.id] || {};
        const text = typeof material === "string" ? material : material.text;
        const generatedByFunction = typeof pilotPack?.[`get${spec.id[0].toUpperCase()}${spec.id.slice(1)}Copy`] === "function";
        const generatedSummary = spec.id === "summary" && typeof pilotPack?.createPilotMaterialsSummary === "function";
        const passFromGenerator = !materialBundleProvided && (generatedByFunction || generatedSummary);
        return makeCheck({
          id: `pilot-material-${spec.id}`,
          label: spec.label,
          status: hasText(text) || passFromGenerator ? "pass" : "fail",
          severity: "medium",
          summary: hasText(text) ? "Material copy is available." : passFromGenerator ? "Generator function is available." : "Material is missing.",
          detail: hasText(text) ? `${normalizeText(text).length} characters` : "No text payload passed.",
          recommendedFix: `Restore ${spec.label} in pilotReadinessPack.js or the Pilot Materials page.`,
          sourceDetails: { materialId: spec.id, length: normalizeText(text).length }
        });
      })
    ];
    const dataRequest = normalizeText((materials.dataRequest || {}).text || materials.dataRequest || "");
    checks.push(makeCheck({
      id: "pilot-data-request-sensitive-fields",
      label: "Data Request excludes sensitive fields",
      status: /no payroll|data not needed|not needed/i.test(dataRequest) && /payroll|pricing|hr|sensitive/i.test(dataRequest) ? "pass" : "warn",
      severity: "medium",
      summary: /no payroll|data not needed|not needed/i.test(dataRequest) ? "Data request states sensitive data is not needed." : "Sensitive-data boundary is not explicit enough.",
      detail: "Checks for payroll/pricing/HR/sensitive-data exclusion language.",
      recommendedFix: "Keep payroll, pricing, HR notes, and sensitive personal data explicitly out of pilot requirements.",
      sourceDetails: { hasSensitiveBoundary: /no payroll|data not needed|not needed/i.test(dataRequest) }
    }));
    return createSection(
      "pilot-materials-qa",
      "Pilot Materials QA",
      "Verifies the founder-facing pilot materials and copy library are ready.",
      checks
    );
  }

  function parseStoredJson(value) {
    if (!hasText(value)) return { ok: true, empty: true, value: null };
    try {
      return { ok: true, empty: false, value: JSON.parse(value) };
    } catch (error) {
      return { ok: false, empty: false, value: null, error: error.message };
    }
  }

  function createDemoResetPlan() {
    return {
      storageKeys: [...KNOWN_DEMO_STORAGE_KEYS],
      stateKeys: [
        "walkthrough state",
        "TRD-104 demo assignment",
        "TRD-104 decision log entries",
        "pilot story import preview",
        "pilot scorecard",
        "pre-demo checklist"
      ]
    };
  }

  function checkLocalDemoState(storageSnapshot = {}, context = {}) {
    const relevantKeys = Object.keys(storageSnapshot).filter(key => key.startsWith("cmtcommand-"));
    const walkthrough = parseStoredJson(storageSnapshot["cmtcommand-demo-walkthrough"]);
    const checklist = parseStoredJson(storageSnapshot["cmtcommand-demo-control-checklist"]);
    const stateSummary = {
      selectedPage: context.selectedPage || context.activePage || "Unknown",
      uiMode: context.uiMode || "Unknown",
      theme: context.theme || "Unknown",
      walkthroughActive: Boolean(context.walkthroughActive),
      walkthroughCompleted: Boolean(context.walkthroughCompleted),
      walkthroughSkipped: Boolean(context.walkthroughSkipped),
      trd104ApprovalState: context.trd104Approved ? "Approved" : "Not approved in current state",
      decisionLogEntryCount: Number(context.decisionLogEntryCount ?? asArray(context.decisionLog).length ?? 0),
      scorecardCheckedCount: Number(context.scorecardCheckedCount || 0),
      relevantStorageKeys: relevantKeys
    };
    const resetPlan = createDemoResetPlan();
    const checks = [
      makeCheck({
        id: "local-storage-namespaced",
        label: "Relevant localStorage keys are namespaced",
        status: relevantKeys.every(key => key.startsWith("cmtcommand-")) ? "pass" : "fail",
        severity: "critical",
        summary: "QA only inspects CMTCommand-prefixed local storage keys.",
        detail: relevantKeys.join(", ") || "No CMTCommand keys found.",
        recommendedFix: "Use CMTCommand-prefixed keys for demo state.",
        sourceDetails: { relevantKeys }
      }),
      makeCheck({
        id: "walkthrough-storage-valid",
        label: "Walkthrough local state is valid",
        status: walkthrough.ok ? "pass" : "warn",
        severity: "medium",
        summary: walkthrough.ok ? "Walkthrough storage is valid or empty." : "Walkthrough storage is invalid JSON.",
        detail: walkthrough.error || (walkthrough.empty ? "No saved walkthrough state." : "Saved walkthrough state parsed."),
        recommendedFix: "Reset Walkthrough State from the Demo Control Center.",
        sourceDetails: { empty: walkthrough.empty, error: walkthrough.error }
      }),
      makeCheck({
        id: "checklist-storage-valid",
        label: "Pre-demo checklist local state is valid",
        status: checklist.ok ? "pass" : "warn",
        severity: "low",
        summary: checklist.ok ? "Checklist storage is valid or empty." : "Checklist storage is invalid JSON.",
        detail: checklist.error || (checklist.empty ? "No saved checklist state." : "Saved checklist state parsed."),
        recommendedFix: "Reset Checklist from the Demo Control Center.",
        sourceDetails: { empty: checklist.empty, error: checklist.error }
      }),
      makeCheck({
        id: "full-reset-targets-known-keys",
        label: "Full Demo Reset targets known demo keys only",
        status: resetPlan.storageKeys.every(key => KNOWN_DEMO_STORAGE_KEYS.includes(key)) ? "pass" : "fail",
        severity: "critical",
        summary: "Full reset plan is limited to known demo storage keys.",
        detail: resetPlan.storageKeys.join(", "),
        recommendedFix: "Do not clear all localStorage; clear only known demo keys.",
        sourceDetails: resetPlan
      })
    ];
    return createSection(
      "local-demo-state",
      "Local Demo State Inspector",
      "Summarizes safe local demo state without exposing raw storage walls.",
      checks,
      { stateSummary, resetPlan }
    );
  }

  function getRecommendedNextAction(overallStatus, failingChecks, warningChecks, criticalFailures) {
    if (criticalFailures.length) return `Fix critical item first: ${criticalFailures[0].label}.`;
    if (failingChecks.length) return `Fix failing check first: ${failingChecks[0].label}.`;
    const materialWarnings = warningChecks.filter(check => check.severity !== "low");
    if (materialWarnings.length) return `Review warning before demo: ${materialWarnings[0].label}.`;
    if (overallStatus === "Ready for Demo") return "Run the short browser smoke: Pilot Story Mode, approve Maria Lopez, show Decision Log, then open Pilot Materials.";
    return "Review warnings and rerun the QA report before the meeting.";
  }

  function createDemoHealthReport(context = {}) {
    const sections = [
      checkRequiredUtilities(context),
      checkTRD104Story(context),
      checkWalkthroughTargets(context.document, context),
      checkCopyMaterials(context),
      checkOperationalImpact(context),
      checkDecisionLogState(context),
      checkPilotMaterials(context),
      checkLocalDemoState(context.storageSnapshot || {}, context.localState || context)
    ];
    const checks = sections.flatMap(section => section.checks);
    const passingChecks = checks.filter(check => check.status === "pass");
    const warningChecks = checks.filter(check => check.status === "warn");
    const failingChecks = checks.filter(check => check.status === "fail");
    const criticalFailures = failingChecks.filter(check => check.severity === "critical");
    const materialWarnings = warningChecks.filter(check => check.severity !== "low");
    const overallStatus = criticalFailures.length
      ? "Broken / Missing Critical Items"
      : failingChecks.length || materialWarnings.length
        ? "Needs Attention"
        : "Ready for Demo";
    const recommendedNextAction = getRecommendedNextAction(overallStatus, failingChecks, warningChecks, criticalFailures);
    return {
      generatedAt: getGeneratedAt(context),
      overallStatus,
      passingChecks: passingChecks.length,
      warningChecks: warningChecks.length,
      failingChecks: failingChecks.length,
      criticalFailures,
      recommendedNextAction,
      sections,
      sourceDetails: {
        checksReviewed: checks.length,
        sectionCount: sections.length,
        lowSeverityWarnings: warningChecks.filter(check => check.severity === "low").length,
        materialWarnings: materialWarnings.length
      }
    };
  }

  function createPreDemoChecklist() {
    return PRE_DEMO_CHECKLIST.map(item => ({ ...item }));
  }

  function createKnownLimitations() {
    return [...KNOWN_LIMITATIONS];
  }

  function sectionLine(section) {
    return `${section.label}: ${section.status.toUpperCase()} (${section.passingChecks} pass, ${section.warningChecks} warn, ${section.failingChecks} fail)`;
  }

  function createQAReportCopy(healthReport) {
    const report = healthReport || createDemoHealthReport({});
    const limitations = createKnownLimitations();
    const sections = report.sections || [];
    const localState = sections.find(section => section.id === "local-demo-state")?.stateSummary || {};
    return [
      "CMTCommand Demo Control Center QA Report",
      "",
      `Demo Health: ${report.overallStatus}`,
      `Generated: ${report.generatedAt}`,
      `Checks: ${report.passingChecks} passing / ${report.warningChecks} warning / ${report.failingChecks} failing`,
      `Recommended next action: ${report.recommendedNextAction}`,
      "",
      "Section Summary",
      ...sections.map(sectionLine),
      "",
      "TRD-104 Story Status",
      sectionLine(sections.find(section => section.id === "trd-104-story") || { label: "TRD-104 Story Status", status: "missing", passingChecks: 0, warningChecks: 0, failingChecks: 0 }),
      "",
      "Walkthrough Target Audit",
      sectionLine(sections.find(section => section.id === "walkthrough-target-audit") || { label: "Walkthrough Target Audit", status: "missing", passingChecks: 0, warningChecks: 0, failingChecks: 0 }),
      "",
      "Copy Material Audit",
      sectionLine(sections.find(section => section.id === "copy-material-audit") || { label: "Copy Material Audit", status: "missing", passingChecks: 0, warningChecks: 0, failingChecks: 0 }),
      "",
      "Operational Impact QA",
      sectionLine(sections.find(section => section.id === "operational-impact-qa") || { label: "Operational Impact QA", status: "missing", passingChecks: 0, warningChecks: 0, failingChecks: 0 }),
      "",
      "Pilot Materials QA",
      sectionLine(sections.find(section => section.id === "pilot-materials-qa") || { label: "Pilot Materials QA", status: "missing", passingChecks: 0, warningChecks: 0, failingChecks: 0 }),
      "",
      "Local State Summary",
      `Selected page: ${localState.selectedPage || "Unknown"}`,
      `UI mode: ${localState.uiMode || "Unknown"}`,
      `TRD-104 approval state: ${localState.trd104ApprovalState || "Unknown"}`,
      `Decision Log entries: ${localState.decisionLogEntryCount ?? "Unknown"}`,
      "",
      "Known Limitations",
      ...limitations.map(item => `- ${item}`),
      "",
      `Recommended next action: ${report.recommendedNextAction}`
    ].join("\n");
  }

  function createCopyMaterialsSnapshot(copyMaterials = [], title = "CMTCommand Demo Materials Snapshot") {
    const materials = Array.isArray(copyMaterials)
      ? copyMaterials
      : Object.entries(copyMaterials).map(([id, value]) => ({ id, ...(typeof value === "string" ? { text: value } : value) }));
    return [
      title,
      "",
      ...materials.map(item => [
        item.label || item.id,
        normalizeText(item.text) || "No copy payload available."
      ].join("\n"))
    ].join("\n\n");
  }

  return {
    REQUIRED_UTILITY_SPECS,
    COPY_MATERIAL_SPECS,
    PILOT_MATERIAL_SPECS,
    KNOWN_DEMO_STORAGE_KEYS,
    createDemoHealthReport,
    checkTRD104Story,
    checkRequiredUtilities,
    checkWalkthroughTargets,
    checkCopyMaterials,
    checkOperationalImpact,
    checkDecisionLogState,
    checkPilotMaterials,
    checkLocalDemoState,
    createPreDemoChecklist,
    createKnownLimitations,
    createQAReportCopy,
    createCopyMaterialsSnapshot,
    createDemoResetPlan
  };
});
