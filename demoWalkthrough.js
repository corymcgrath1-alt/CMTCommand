(function initDemoWalkthrough(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTDemoWalkthrough = api;
})(typeof window !== "undefined" ? window : globalThis, function buildDemoWalkthrough() {
  const WALKTHROUGH_MODE = "pilot-story";

  const walkthroughSteps = [
    {
      id: "scheduled-not-ready",
      page: "command",
      target: "tomorrow-ops-brief",
      title: "Scheduled Does Not Mean Ready",
      seeing: "Tomorrow has scheduled work, but CMTCommand separates scheduled from actually ready.",
      why: "In CMT, a job can be on the calendar and still fail tomorrow because of missing certifications, equipment, calibration, location, or coverage.",
      takeaway: "This gives managers a readiness view before the morning scramble.",
      primaryLabel: "Next"
    },
    {
      id: "risk-summarized",
      page: "command",
      target: "tomorrow-ops-brief",
      title: "Tomorrow's Risk Is Summarized",
      seeing: "The Ops Brief compresses tomorrow's schedule into ready, at-risk, and not-ready work.",
      why: "Managers should not have to inspect every work order manually just to know where the fire is.",
      takeaway: "The system tells them where to look first.",
      primaryLabel: "Next"
    },
    {
      id: "trd-104-highest-risk",
      page: "command",
      target: "trd-104-work-order",
      title: "TRD-104 Is the Highest-Risk Job",
      seeing: "TRD-104 is flagged as the highest-risk work order.",
      why: "It has a readiness blocker that could turn into a failed dispatch if no one catches it today.",
      takeaway: "The product identifies the job most likely to break tomorrow.",
      primaryLabel: "Open TRD-104"
    },
    {
      id: "readiness-packet",
      page: "demo",
      target: "trd-104-readiness-packet",
      title: "The Readiness Packet Explains Why",
      seeing: "The Readiness Packet shows the service type, required qualifications, current blocker, recommended action, and source details.",
      why: "Managers need explainable recommendations, not a black-box warning.",
      takeaway: "CMTCommand preserves the source facts behind the risk.",
      primaryLabel: "Find Coverage"
    },
    {
      id: "find-coverage",
      page: "demo",
      target: "maria-coverage-recommendation",
      title: "Find Coverage",
      seeing: "CMTCommand recommends Maria Lopez as the best coverage option.",
      why: "The system is not just flagging a problem; it is moving the dispatcher toward a fix.",
      takeaway: "This turns readiness review into action.",
      primaryLabel: "Review Handoff"
    },
    {
      id: "coverage-handoff",
      page: "demo",
      target: "maria-coverage-handoff",
      title: "Coverage Handoff Packet",
      seeing: "The Coverage Handoff explains why Maria is recommended: qualification match, availability, and operational fit.",
      why: "A PM or dispatcher needs a clean reason before approving a coverage change.",
      takeaway: "The system creates a defensible handoff, not just a name.",
      primaryLabel: "Approve Coverage"
    },
    {
      id: "approve-coverage",
      page: "demo",
      target: "approve-coverage-plan",
      title: "Approve the Coverage Plan",
      seeing: "Approving Maria Lopez applies the coverage decision to TRD-104.",
      why: "The decision moves the work order out of its highest-risk state and documents what changed.",
      takeaway: "CMTCommand closes the loop from risk detection to action.",
      primaryLabel: "Approve Maria Lopez"
    },
    {
      id: "decision-log",
      page: "decisionlog",
      target: "decision-impact-summary",
      title: "Decision Log Captures the Why",
      seeing: "The Decision Log records the before status, blocker, assigned coverage, reason, timestamp, and impact.",
      why: "Operations decisions need traceability, especially when tomorrow's schedule changes.",
      takeaway: "This creates accountability without requiring a separate writeup.",
      primaryLabel: "Show Impact"
    },
    {
      id: "operational-impact",
      page: "command",
      target: "pilot-roi-snapshot",
      title: "Operational Impact Shows the Business Case",
      seeing: "Operational Impact shows issues caught, estimated review time saved, highest-risk work, repeat patterns, and bottlenecks.",
      why: "Managers need to know not just what happened, but what the product prevented and what keeps recurring.",
      takeaway: "This is the proof layer for a paid pilot.",
      primaryLabel: "Check Pilot Data"
    },
    {
      id: "pilot-data-readiness",
      page: "dataintake",
      target: "smart-intake-summary",
      title: "Pilot Data Readiness",
      seeing: "Smart Intake Summary checks whether pilot data is clean enough for readiness analysis.",
      why: "Many firms do not know their scheduling data is missing the fields needed to make good dispatch decisions.",
      takeaway: "CMTCommand can start creating value during pilot setup by showing exactly what data needs cleanup.",
      primaryLabel: "Finish"
    },
    {
      id: "final-pilot-takeaway",
      page: "command",
      target: "demo-final-recap",
      title: "Final Pilot Takeaway",
      seeing: "CMTCommand caught a readiness risk, recommended coverage, documented the decision, and showed operational impact.",
      why: "This is the complete buyer story: fewer morning surprises, faster coverage decisions, better source-backed accountability.",
      takeaway: "CMTCommand helps CMT/geotech/special inspection firms catch tomorrow's dispatch failures before they happen.",
      primaryLabel: "Close"
    }
  ];

  function getSteps() {
    return walkthroughSteps.map(step => ({ ...step }));
  }

  function getStep(stepId) {
    return walkthroughSteps.find(step => step.id === stepId) || walkthroughSteps[0];
  }

  function getStepIndex(stepId) {
    return Math.max(0, walkthroughSteps.findIndex(step => step.id === stepId));
  }

  function getProgress(stepId) {
    const index = getStepIndex(stepId);
    return {
      index,
      current: index + 1,
      total: walkthroughSteps.length,
      label: `Step ${index + 1} of ${walkthroughSteps.length}`,
      percent: Math.round(((index + 1) / walkthroughSteps.length) * 100)
    };
  }

  function getNextStepId(stepId) {
    const index = getStepIndex(stepId);
    return walkthroughSteps[Math.min(walkthroughSteps.length - 1, index + 1)].id;
  }

  function getPreviousStepId(stepId) {
    const index = getStepIndex(stepId);
    return walkthroughSteps[Math.max(0, index - 1)].id;
  }

  function createInitialState(now = "") {
    return {
      isWalkthroughActive: false,
      currentWalkthroughStepId: walkthroughSteps[0].id,
      completedWalkthroughStepIds: [],
      walkthroughStartedAt: "",
      walkthroughCompletedAt: "",
      walkthroughMode: WALKTHROUGH_MODE,
      walkthroughWasSkipped: false,
      walkthroughActionsTaken: {
        viewedTomorrowReadiness: false,
        viewedTRD104Packet: false,
        viewedCoverageRecommendation: false,
        approvedMariaLopez: false,
        viewedDecisionLog: false,
        viewedOperationalImpact: false,
        viewedPilotSetup: false
      },
      createdAt: now
    };
  }

  function resetWalkthroughState(now = "") {
    return createInitialState(now);
  }

  function getTargetIds() {
    return walkthroughSteps.map(step => step.target);
  }

  function getUniqueTargetIds() {
    return [...new Set(getTargetIds())];
  }

  function createDemoRecap(context = {}) {
    const approved = Boolean(context.approvedMariaLopez);
    const impact = context.impactSnapshot || {};
    const timeSaved = impact.estimatedReviewTimeSavedMinutes || {};
    const highestRisk = impact.highestRiskWorkOrder || {};
    const topPattern = impact.repeatFailurePatterns?.[0] || {};
    const managerAction = impact.recommendedManagerActions?.[0] || "Review tomorrow's readiness blockers before dispatch.";
    const decisionText = approved
      ? "The system recommended Maria Lopez as the best available coverage match, generated a source-backed handoff packet, and documented the approval in the Decision Log."
      : "The system recommended Maria Lopez as the best available coverage match and prepared a source-backed handoff packet for approval.";
    const reviewTime = Number.isFinite(timeSaved.savedMinutesLow) && Number.isFinite(timeSaved.savedMinutesHigh)
      ? `${timeSaved.savedMinutesLow}-${timeSaved.savedMinutesHigh} minutes`
      : "a conservative amount of manager review time";
    return [
      "CMTCommand Demo Recap",
      "",
      `Scheduled does not mean ready. In this demo, CMTCommand reviewed tomorrow's scheduled work and identified ${highestRisk.id || "TRD-104"} as the highest-risk work order because it was missing qualified reinforced concrete inspection coverage.`,
      "",
      decisionText,
      "",
      `Operational Impact showed ${impact.issuesCaughtBeforeTomorrow ?? "the"} issue${impact.issuesCaughtBeforeTomorrow === 1 ? "" : "s"} caught before tomorrow, estimated review time saved of ${reviewTime}, repeat failure patterns, and coverage bottlenecks. Pilot Setup also showed whether imported scheduling data is clean enough for readiness analysis.`,
      "",
      `Top repeat failure pattern: ${topPattern.title || "Certification and coverage gaps are the main readiness constraint."}`,
      `Recommended manager action: ${managerAction}`,
      "",
      "Buyer takeaway: CMTCommand helps CMT/geotech/special inspection firms catch tomorrow's dispatch failures before they become morning emergencies."
    ].join("\n");
  }

  function validateSteps(steps = walkthroughSteps) {
    return steps.every(step => step.id && step.title && step.seeing && step.why && step.takeaway && step.primaryLabel);
  }

  return {
    WALKTHROUGH_MODE,
    walkthroughSteps,
    getSteps,
    getStep,
    getStepIndex,
    getProgress,
    getNextStepId,
    getPreviousStepId,
    createInitialState,
    resetWalkthroughState,
    getTargetIds,
    getUniqueTargetIds,
    createDemoRecap,
    validateSteps
  };
});
