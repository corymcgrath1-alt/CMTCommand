(function initPilotReadinessPack(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTPilotReadinessPack = api;
})(typeof window !== "undefined" ? window : globalThis, function buildPilotReadinessPack() {
  const audienceQuestions = {
    owner: {
      label: "Owner / Executive",
      questions: [
        "How often do readiness issues turn into morning emergencies?",
        "What does a failed dispatch cost you in rework, client trust, overtime, or rescheduling?",
        "How do you currently know whether tomorrow's work is actually ready?",
        "Which offices or service lines are hardest to staff?",
        "What would make a 30-day pilot worth continuing?"
      ]
    },
    operations: {
      label: "Operations Manager / Dispatcher",
      questions: [
        "How do you currently check technician availability, certifications, and equipment readiness?",
        "Where do tomorrow's schedule problems usually come from?",
        "How often do you discover coverage gaps too late?",
        "What spreadsheet, board, or system do you trust most right now?",
        "What would save you the most time during afternoon schedule review?"
      ]
    },
    pm: {
      label: "PM / CMT Manager",
      questions: [
        "Which service types are hardest to cover?",
        "How do you know whether a technician is qualified for a specific job?",
        "Where do certification or clearance gaps show up?",
        "How are coverage decisions documented today?",
        "What causes the most client-facing schedule risk?"
      ]
    },
    lab: {
      label: "Lab / Equipment / Accreditation",
      questions: [
        "How do you track calibration status?",
        "How do equipment issues affect field readiness?",
        "How do accreditation requirements show up in daily operations?",
        "Which equipment records are hardest to keep current?",
        "What would help prevent last-minute equipment surprises?"
      ]
    }
  };

  const founderChecklist = {
    before: [
      "Confirm audience: owner, branch manager, operations manager, dispatcher, PM, lab manager, or CMT manager.",
      "Open Tomorrow Readiness.",
      "Reset demo state if needed.",
      "Start with \"Scheduled does not mean ready.\"",
      "Know the TRD-104 story.",
      "Have the Pilot Data Request ready."
    ],
    during: [
      "Run Pilot Story Mode.",
      "Pause on TRD-104.",
      "Ask whether this kind of coverage issue happens in their office.",
      "Show the Coverage Handoff Packet.",
      "Approve Maria Lopez.",
      "Show Decision Log.",
      "Show Operational Impact.",
      "Ask what fields they currently track.",
      "Ask what would make a pilot useful."
    ],
    after: [
      "Send follow-up summary.",
      "Ask for limited pilot export.",
      "Define success criteria.",
      "Schedule next review.",
      "Capture objections."
    ]
  };

  const minimumData = {
    workOrders: [
      "Work order ID",
      "Scheduled date",
      "Scheduled time or shift",
      "Service type",
      "Project/client nickname or anonymized project name",
      "Location, area, branch, or region",
      "Assigned technician, if any",
      "Required certification or inspection type",
      "Required equipment type",
      "Current status, if tracked"
    ],
    technicians: [
      "Technician name or anonymized ID",
      "Office/branch",
      "Certifications",
      "Availability/PTO indicator",
      "Service types they can cover",
      "Equipment authorization, if applicable"
    ],
    equipment: [
      "Equipment ID or anonymized ID",
      "Equipment type",
      "Assigned office/branch",
      "Calibration due date",
      "Availability status"
    ],
    optional: [
      "Priority",
      "Client due time",
      "Site access requirement",
      "Security clearance requirement",
      "Notes",
      "Backup technician",
      "Drive region/zone"
    ],
    notNeeded: [
      "Pay rates",
      "Employee home addresses",
      "Social Security numbers",
      "Personal phone numbers",
      "Client pricing",
      "Invoices",
      "Payroll",
      "HR notes",
      "Medical/private employee information"
    ]
  };

  const successCriteria = [
    "Detect readiness blockers before the next-day schedule is finalized.",
    "Reduce manual afternoon schedule review time.",
    "Identify repeated certification, coverage, equipment, or data-quality bottlenecks.",
    "Produce source-backed coverage handoffs.",
    "Create a decision record for coverage changes.",
    "Improve confidence that scheduled work is actually ready.",
    "Identify which data fields the firm needs to clean up."
  ];

  const pilotMetrics = [
    "Number of scheduled jobs reviewed.",
    "Number of readiness issues caught before dispatch.",
    "Number of not-ready jobs resolved before next morning.",
    "Estimated review time saved.",
    "Number of coverage bottlenecks identified.",
    "Number of repeat failure patterns found.",
    "Data quality score before and after cleanup.",
    "Manager confidence rating before and after pilot."
  ];

  const objections = [
    {
      objection: "This looks like another scheduling app.",
      response: "CMTCommand is not replacing scheduling first. It sits above the schedule and asks whether tomorrow's scheduled work is actually ready."
    },
    {
      objection: "We already use spreadsheets.",
      response: "That is expected. The pilot can start from spreadsheets. The question is whether those spreadsheets expose readiness blockers early enough."
    },
    {
      objection: "Our data is messy.",
      response: "That is part of what the pilot measures. Smart Intake shows what fields are missing before the firm depends on the system."
    },
    {
      objection: "We do not want AI making staffing decisions.",
      response: "This demo uses deterministic rules and source-backed recommendations. Managers approve coverage changes. The system explains why it made the recommendation."
    },
    {
      objection: "We cannot share sensitive data.",
      response: "The pilot can use anonymized work orders, technician IDs, service types, certifications, equipment status, and branch/region. Payroll, pricing, HR notes, and personal data are not needed."
    },
    {
      objection: "We already know our people.",
      response: "That is true for experienced managers. The value is catching gaps earlier, documenting decisions, helping backups step in, and revealing repeated bottlenecks across offices or service lines."
    },
    {
      objection: "How do we know this saves money?",
      response: "The pilot does not need to claim exact ROI. It measures issues caught, time saved during review, not-ready jobs resolved before morning, repeat blockers, and manager confidence."
    }
  ];

  const scorecardItems = [
    "Did the buyer recognize the TRD-104 problem?",
    "Did they agree scheduled does not mean ready?",
    "Did they mention current spreadsheet/manual review pain?",
    "Did they care about certification coverage?",
    "Did they care about equipment/calibration readiness?",
    "Did they care about decision traceability?",
    "Did they ask about using their own data?",
    "Did they identify a real office/service line for a pilot?",
    "Did they object mainly to scope, data, trust, price, or change management?",
    "Did they agree to a next step?"
  ];

  function asLines(title, rows) {
    return [title, ...rows.map(row => `- ${row}`)].join("\n");
  }

  function getPilotQualificationQuestions() {
    return JSON.parse(JSON.stringify(audienceQuestions));
  }

  function getFounderChecklistCopy() {
    return [
      "CMTCommand Founder Demo Checklist",
      "",
      asLines("Before the meeting", founderChecklist.before),
      "",
      asLines("During the meeting", founderChecklist.during),
      "",
      asLines("After the meeting", founderChecklist.after)
    ].join("\n");
  }

  function getQuestionCopy(groupKey = "all") {
    const groups = groupKey === "all"
      ? Object.values(audienceQuestions)
      : [audienceQuestions[groupKey]].filter(Boolean);
    return groups.map(group => asLines(group.label, group.questions)).join("\n\n");
  }

  function getPilotDataRequestCopy() {
    return [
      "CMTCommand Pilot Data Request",
      "",
      "Start with a limited export. No payroll, pricing, client financials, employee personal data, or sensitive HR data needed.",
      "",
      asLines("Work orders / schedule", minimumData.workOrders),
      "",
      asLines("Technicians", minimumData.technicians),
      "",
      asLines("Equipment", minimumData.equipment),
      "",
      asLines("Optional fields", minimumData.optional),
      "",
      asLines("Data not needed", minimumData.notNeeded)
    ].join("\n");
  }

  function getPilotSuccessCriteriaCopy() {
    return [
      "CMTCommand Pilot Success Criteria",
      "",
      asLines("2-4 week success criteria", successCriteria),
      "",
      asLines("Suggested pilot metrics", pilotMetrics)
    ].join("\n");
  }

  function getObjectionHandlingCopy(short = false) {
    if (short) {
      return [
        "CMTCommand Short Objection Responses",
        ...objections.map(item => `- ${item.objection} ${item.response}`)
      ].join("\n");
    }
    return [
      "CMTCommand Objection Handling",
      "",
      ...objections.map(item => `Objection: ${item.objection}\nResponse: ${item.response}`)
    ].join("\n\n");
  }

  function getManagerEmailCopy() {
    return [
      "Subject: Quick CMT readiness demo idea",
      "",
      "Hi [Name],",
      "",
      "I've been building a focused operations tool for CMT/geotech/special inspection teams. It is not meant to replace your scheduling system. The first use case is simpler: checking whether tomorrow's scheduled work is actually ready.",
      "",
      "The demo shows a common problem: a job is on the schedule, but it is not truly ready because coverage, certification, equipment, calibration, or data is missing. CMTCommand flags the blocker, explains the source details, recommends a coverage fix, records the decision, and shows the operational impact.",
      "",
      "I'd like to show you a short 5-minute walkthrough and ask whether this matches problems your team already deals with.",
      "",
      "If it looks useful, the next step would be a limited pilot using anonymized schedule, technician, certification, and equipment data - no payroll, pricing, HR notes, or sensitive personal information needed.",
      "",
      "Would you be open to taking a look?"
    ].join("\n");
  }

  function getPostDemoFollowUpCopy(context = {}) {
    const summary = createPilotMaterialsSummary(context);
    return [
      "Subject: Follow-up from CMTCommand readiness walkthrough",
      "",
      "Hi [Name],",
      "",
      "Thank you for taking a look at CMTCommand.",
      "",
      "The walkthrough focused on one practical question: tomorrow's work may be scheduled, but is it actually ready? In the demo, CMTCommand reviewed tomorrow readiness, flagged the highest-risk work order, explained the coverage blocker, recommended a coverage fix, documented the decision, and showed operational impact.",
      "",
      `Current demo proof: ${summary.highestRiskWorkOrder} was the highest-risk demo work order, ${summary.issuesCaughtBeforeTomorrow} issues were caught before tomorrow, and estimated review time saved was ${summary.estimatedReviewTimeSaved}.`,
      "",
      "For a pilot, the useful next step would be a limited export of anonymized schedule, technician, certification, and equipment data. Payroll, pricing, HR notes, and sensitive personal information are not needed.",
      "",
      "Suggested next step: choose one office, branch, or service line and test whether CMTCommand can catch readiness blockers before the next-day schedule is finalized.",
      "",
      "Optional questions for your team:",
      "- Which service line creates the most coverage stress?",
      "- Which fields would be easiest to export first?",
      "- What would make a 2-4 week pilot worth continuing?"
    ].join("\n");
  }

  function getOnePageBusinessCaseCopy(context = {}) {
    const summary = createPilotMaterialsSummary(context);
    return [
      "CMTCommand One-Page Business Case",
      "",
      "Problem",
      "CMT/geotech/special inspection firms often know what is scheduled tomorrow, but not whether every scheduled job is truly ready. Readiness can fail because of certification gaps, equipment calibration risk, technician availability, unclear service requirements, or incomplete schedule data.",
      "",
      "Why now",
      "Afternoon schedule review is still often manual, spreadsheet-heavy, and dependent on experienced people remembering every certification, coverage, equipment, and site requirement.",
      "",
      "Demo proof",
      `The demo identifies ${summary.highestRiskWorkOrder} as the highest-risk work order, catches ${summary.issuesCaughtBeforeTomorrow} readiness issues before tomorrow, and estimates ${summary.estimatedReviewTimeSaved} of review time saved. It also shows ${summary.topRepeatFailurePattern.toLowerCase()} and a manager action: ${summary.recommendedManagerAction}`,
      "",
      "Pilot scope",
      "Run a focused 2-4 week pilot for one office, branch, or service line. Use CMTCommand to review next-day readiness, source-backed coverage handoffs, decision records, repeat failure patterns, and data quality.",
      "",
      "Data needed",
      "Anonymized work orders, scheduled date/time, service type, project nickname, location/region, assigned technician, required certifications, required equipment, technician certification/availability, and equipment calibration/availability.",
      "",
      "Success criteria",
      "Measure issues caught before dispatch, not-ready jobs resolved before morning, estimated review time saved, coverage bottlenecks identified, repeat failure patterns found, data quality score, and manager confidence before/after the pilot.",
      "",
      "What is out of scope",
      "No payroll, pricing, invoices, HR notes, sensitive personal data, lab result reporting, boring logs, accounting, ERP, CRM, or full project management.",
      "",
      "Recommended next step",
      "Run the Pilot Story Mode with a manager, confirm the pain is real, then request a limited anonymized data export for one pilot office or service line."
    ].join("\n");
  }

  function getDemoScorecardCopy(scorecardState = {}) {
    const checked = new Set(Object.entries(scorecardState)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key));
    return [
      "CMTCommand Demo Scorecard",
      "",
      ...scorecardItems.map((item, index) => `${checked.has(`score-${index}`) ? "[x]" : "[ ]"} ${item}`)
    ].join("\n");
  }

  function createPilotMaterialsSummary(context = {}) {
    const impact = context.impactSnapshot || {};
    const timeSaved = impact.estimatedReviewTimeSavedMinutes || {};
    return {
      highestRiskWorkOrder: impact.highestRiskWorkOrder?.id || "TRD-104",
      issuesCaughtBeforeTomorrow: impact.issuesCaughtBeforeTomorrow ?? "7",
      estimatedReviewTimeSaved: Number.isFinite(timeSaved.savedMinutesLow) && Number.isFinite(timeSaved.savedMinutesHigh)
        ? `${timeSaved.savedMinutesLow}-${timeSaved.savedMinutesHigh} min`
        : "35-50 min est.",
      topRepeatFailurePattern: impact.repeatFailurePatterns?.[0]?.title || "Certification and coverage gaps are the main readiness constraint",
      dataQualityGrade: impact.dataQualityScore?.gradeLabel || "Usable",
      recommendedManagerAction: impact.recommendedManagerActions?.[0] || "Approve Maria Lopez for TRD-104 coverage, then request a limited pilot data export."
    };
  }

  return {
    founderChecklist,
    minimumData,
    successCriteria,
    pilotMetrics,
    objections,
    scorecardItems,
    createPilotMaterialsSummary,
    getPilotQualificationQuestions,
    getPilotDataRequestCopy,
    getPilotSuccessCriteriaCopy,
    getObjectionHandlingCopy,
    getManagerEmailCopy,
    getPostDemoFollowUpCopy,
    getOnePageBusinessCaseCopy,
    getDemoScorecardCopy,
    getFounderChecklistCopy,
    getQuestionCopy
  };
});
