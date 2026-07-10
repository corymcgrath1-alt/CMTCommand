const fs = require("fs");
const path = require("path");

const cdpBase = "http://127.0.0.1:9224";
const appUrl = "http://127.0.0.1:8765/?ui=standard";
const artifactDir = __dirname;

function addAssertion(assertions, condition, label, details = {}) {
  assertions.push({
    label,
    passed: Boolean(condition),
    details
  });
}

function writeResult(result) {
  fs.writeFileSync(
    path.join(artifactDir, "phase5-browser-validation.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
}

function validateResult(result) {
  const assertions = [];
  const check = (condition, label, details) => addAssertion(assertions, condition, label, details);
  const includes = (text, expected, label) => check(String(text || "").includes(expected), label, { expected, actual: text });
  const equals = (actual, expected, label) => check(actual === expected, label, { expected, actual });

  equals(result.loading?.safetyGlobal, true, "Pilot intake safety utility is loaded");
  equals(result.empty?.pageTitle, "Pilot Setup", "Pilot Setup page loads");
  equals(result.empty?.hasPreview, false, "Pilot Setup starts without an import preview");
  equals(result.empty?.horizontalOverflow, false, "Pilot Setup desktop viewport has no horizontal overflow");
  equals(result.success?.badge, "Ready", "Work Orders demo preview is ready");
  equals(result.success?.applyDisabled, false, "Ready preview can be applied");
  equals(result.success?.importSelectValue, "workorders", "Work Orders preview selects the Work Orders import type");
  equals(result.afterApply?.previewVisible, false, "Applying an import clears the preview");
  check(result.afterApply?.importHistoryCount >= 1, "Applying an import adds a local history record", result.afterApply);
  equals(result.hostileCsv?.badge, "Blocked", "Hostile CSV is blocked");
  equals(result.hostileCsv?.applyDisabled, true, "Hostile CSV cannot be applied");
  equals(result.hostileCsv?.unsafeNodes, 0, "Hostile CSV renders without executable nodes");
  equals(result.hostileCsv?.globalCmtXss, false, "Hostile CSV cell payload does not execute");
  equals(result.hostileCsv?.globalFileXss, false, "Hostile CSV filename payload does not execute");
  includes(result.hostileCsv?.headerText, "<img src=x onerror=window.__cmtXss=1>", "Hostile CSV header text remains visible as text");
  includes(result.hostileCsv?.firstCell, "<svg onload=window.__cmtXss=1>", "Hostile CSV text remains visible as text");
  equals(result.validHostileValues?.badge, "Ready", "Hostile values with valid headers remain valid data");
  equals(result.validHostileValues?.unsafeNodes, 0, "Hostile values with valid headers render without executable nodes");
  equals(result.validHostileValues?.globalValidValueXss, false, "Hostile valid-row value does not execute");
  includes(result.validHostileValues?.notesCell, "<img src=x onerror=window.__validValueXss=1>", "Hostile valid-row value remains visible as text");
  includes(result.validHostileValues?.notesCell, "javascript:alert(1)", "javascript URL-like value remains visible as text");
  equals(result.malformed?.badge, "Blocked", "Malformed CSV is blocked");
  equals(result.malformed?.applyDisabled, true, "Malformed CSV cannot be applied");
  equals(result.malformed?.errorVisible, true, "Malformed CSV shows a parse error");
  equals(result.malformed?.historyUnchanged, true, "Malformed CSV leaves applied import history unchanged");
  equals(result.malformed?.stagedRowsCopyHidden, true, "Malformed CSV does not claim rows are staged");
  equals(result.malformed?.noImportedCopy, true, "Malformed CSV preview does not claim accepted rows were imported");
  equals(result.malformed?.copyButtonLabel, "Copy Parse Error", "Malformed CSV uses parse-error copy action");
  equals(result.missingColumns?.badge, "Blocked", "Missing required columns are blocked");
  equals(result.missingColumns?.missingServiceTypeVisible, true, "Missing service_type is reported");
  equals(result.multipleMissingColumns?.missingProjectVisible, true, "Multiple missing columns reports project");
  equals(result.multipleMissingColumns?.missingServiceTypeVisible, true, "Multiple missing columns reports service_type");
  equals(result.multipleMissingColumns?.missingEquipmentVisible, true, "Multiple missing columns reports required_equipment");
  equals(result.partialData?.badge, "Needs review", "Partial valid data is reviewable");
  equals(result.partialData?.applyDisabled, false, "Partial valid data can be applied after review");
  equals(result.partialData?.ampersandVisible, true, "Ampersands and quotes remain visible");
  equals(result.partialData?.cleanupWarningVisible, true, "Partial data shows row-level cleanup warnings");
  equals(result.partialData?.needsCleanupSummaryVisible, true, "Partial data summary reports rows needing cleanup");
  equals(result.oversized?.badge, "Blocked", "Oversized CSV is blocked");
  equals(result.oversized?.boundedMessage, true, "Oversized CSV explains the bounded limit");
  equals(result.readErrorRecovery?.blocked?.badge, "Blocked", "File read errors are blocked");
  equals(result.readErrorRecovery?.recoveredBadge, "Ready", "Import can recover after a read error");
  equals(result.documentMetadata?.unsafeNodes, 0, "Document metadata renders without executable nodes");
  equals(result.documentMetadata?.globalDocXss, false, "Document metadata payload does not execute");
  includes(result.documentMetadata?.filenameText, "<script>window.__docXss=1</script>.pdf", "Document filename text is preserved");
  includes(result.documentMetadata?.notesText, "<img src=x onerror=window.__docXss=1>", "Document notes text is preserved");
  equals(result.pilotRequestConfirmation?.unsafeNodes, 0, "Pilot request confirmation renders without executable nodes");
  equals(result.pilotRequestConfirmation?.globalPilotXss, false, "Pilot request company payload does not execute");
  includes(result.pilotRequestConfirmation?.bannerText, "<img src=x onerror=window.__pilotRequestXss=1>", "Pilot request company text is preserved");
  equals(result.keyboardAndSemantics?.focusedTag, "BUTTON", "Preview Template button is keyboard focusable");
  equals(result.wideViewport?.horizontalOverflow, false, "Wide viewport has no horizontal overflow");
  equals(result.narrowViewport?.horizontalOverflow, false, "Narrow viewport has no horizontal overflow");
  equals(result.afterReload?.hasPreview, false, "Reload clears transient import preview");
  equals(result.afterReload?.hasDocumentCard, false, "Reload clears transient staged documents");
  equals(result.afterReload?.importHistoryCount, 0, "Reload clears transient import history");
  equals(result.demoQa?.includesPilotIntakeSafety, true, "Demo QA reports the Pilot Intake Safety utility");
  equals(result.demoQa?.pilotIntakeSafetyRowPass, true, "Demo QA marks the Pilot Intake Safety utility row as passing");
  equals(result.commandMode?.bodyCommandMode, true, "Command mode remains available");
  equals(result.commandMode?.darkModeToggled, true, "Theme toggle works in command mode");
  equals(result.commandDarkMobile?.horizontalOverflow, false, "Command dark mode has no mobile horizontal overflow");
  equals(result.commandDarkMobile?.bodyCommandMode, true, "Command dark mobile remains in command mode");
  equals(result.commandDarkMobile?.bodyThemeDark, true, "Command dark mobile remains in dark theme");
  equals(result.preferencePersistence?.afterReloadUiMode, "command", "Appearance mode persists across reload without URL override");
  equals(result.preferencePersistence?.afterReloadTheme, "dark", "Theme persists across reload without URL override");
  equals(result.trd104Workflow?.selectedCandidateHasMaria, true, "TRD-104 coverage recommendation selects Maria Lopez");
  equals(result.trd104Workflow?.decisionLogHasMaria, true, "TRD-104 approval records Maria Lopez in the Decision Log");
  equals(result.trd104Workflow?.operationalImpactVisible, true, "Decision Log shows operational impact after approval");
  equals(result.trd104Workflow?.pilotMaterialsVisible, true, "Pilot Materials page remains reachable after approval");
  equals(result.trd104Workflow?.demoQaReady, true, "Demo QA remains ready after TRD-104 workflow");
  equals(result.trd104Workflow?.fullResetReturnsUnapproved, true, "Full Demo Reset clears TRD-104 approval state");
  equals(result.consoleFailureCount, 0, "Browser console has no warnings or errors");
  equals(result.networkFailureCount, 0, "Browser network has no failed requests");

  result.assertions = assertions;
  const failures = assertions.filter(assertion => !assertion.passed);
  if (failures.length) {
    writeResult(result);
    const summary = failures.map(failure => `- ${failure.label}: ${JSON.stringify(failure.details)}`).join("\n");
    throw new Error(`Browser validation failed:\n${summary}`);
  }
}

async function getJson(pathname) {
  const response = await fetch(`${cdpBase}${pathname}`);
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}`);
  return response.json();
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.requests = new Map();
    this.consoleEvents = [];
    this.networkFailures = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 5000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", event => this.handleMessage(event));
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message}: ${message.error.data || ""}`));
      else pending.resolve(message.result || {});
      return;
    }

    if (message.method === "Runtime.consoleAPICalled") {
      const text = (message.params.args || []).map(arg => arg.value || arg.description || "").join(" ");
      this.consoleEvents.push({ type: message.params.type, text });
    }

    if (message.method === "Log.entryAdded") {
      const entry = message.params.entry;
      if (entry.level === "error" || entry.level === "warning") {
        this.consoleEvents.push({ type: entry.level, text: entry.text, url: entry.url });
      }
    }

    if (message.method === "Network.requestWillBeSent") {
      this.requests.set(message.params.requestId, message.params.request.url);
    }

    if (message.method === "Network.responseReceived") {
      const response = message.params.response;
      if (response.status >= 400) {
        this.networkFailures.push({ type: "response", status: response.status, url: response.url });
      }
    }

    if (message.method === "Network.loadingFailed") {
      this.networkFailures.push({
        type: "loadingFailed",
        errorText: message.params.errorText,
        url: this.requests.get(message.params.requestId)
      });
    }

    const waiter = this.waiters.get(message.method);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.waiters.delete(message.method);
      waiter.resolve(message.params);
    }
  }

  send(method, params = {}, timeoutMs = 10000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(method);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.waiters.set(method, { resolve, reject, timer });
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    }, 15000);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime.evaluate failed");
    }
    return result.result.value;
  }

  async navigate(url) {
    const loaded = this.waitFor("Page.loadEventFired", 15000);
    await this.send("Page.navigate", { url });
    await loaded;
  }

  async reload() {
    const loaded = this.waitFor("Page.loadEventFired", 15000);
    await this.send("Page.reload", { ignoreCache: true });
    await loaded;
  }

  async setViewport(width, height, mobile) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      mobile,
      deviceScaleFactor: 1
    });
  }

  async screenshot(fileName) {
    const result = await this.send("Page.captureScreenshot", { format: "png", fromSurface: true }, 15000);
    const filePath = path.join(artifactDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
    return filePath;
  }

  close() {
    this.ws.close();
  }
}

async function getPageWsUrl() {
  const pages = await getJson("/json/list");
  const page = pages.find(item => item.type === "page" && item.webSocketDebuggerUrl);
  if (page) return page.webSocketDebuggerUrl;
  return (await getJson("/json/new?about:blank")).webSocketDebuggerUrl;
}

async function installPageHelpers(client) {
  await client.evaluate(`(() => {
    window.__phase5 = {
      waitFor(condition, timeout = 2500) {
        return new Promise((resolve, reject) => {
          const start = performance.now();
          const tick = () => {
            if (condition()) return resolve(true);
            if (performance.now() - start > timeout) return reject(new Error("waitFor timeout"));
            requestAnimationFrame(tick);
          };
          tick();
        });
      },
      async openPage(page) {
        await this.waitFor(() => document.querySelector('[data-page="' + page + '"]'));
        document.querySelector('[data-page="' + page + '"]').click();
        await this.waitFor(() => document.querySelector("#pageTitle"));
      },
      async openPilot() {
        await this.openPage("dataintake");
        await this.waitFor(() => document.querySelector("#pageTitle")?.textContent === "Pilot Setup");
      },
      async uploadCsv(csv, name) {
        const cancel = document.querySelector("[data-cancel-import]");
        if (cancel) {
          cancel.click();
          await this.waitFor(() => !document.querySelector(".import-preview"));
        }
        const select = document.querySelector("#importEntitySelect");
        if (select) {
          select.value = "workorders";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const file = new File([csv], name || "upload.csv", { type: "text/csv" });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        const input = document.querySelector("#csvImportFile");
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await this.waitFor(() => document.querySelector(".import-preview .badge"));
      },
      previewSnapshot() {
        const preview = document.querySelector(".import-preview");
        return {
          badge: preview?.querySelector(".badge")?.textContent.trim() || "",
          heading: preview?.querySelector("h2")?.textContent.trim() || "",
          applyDisabled: document.querySelector("[data-apply-import]")?.disabled,
          importSelectValue: document.querySelector("#importEntitySelect")?.value || "",
          text: preview?.textContent || "",
          headers: Array.from(preview?.querySelectorAll("th") || []).map(el => el.textContent),
          cells: Array.from(preview?.querySelectorAll("td") || []).map(el => el.textContent),
          unsafeNodes: document.querySelectorAll(".import-preview img,.import-preview svg,.import-preview script").length
        };
      },
      importHistoryCount() {
        return Number(document.querySelector("[data-import-history-count]")?.getAttribute("data-import-history-count") || 0);
      },
      viewportSnapshot() {
        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          searchHeight: document.querySelector(".search-wrap")?.getBoundingClientRect().height,
          topbarHeight: document.querySelector(".topbar")?.getBoundingClientRect().height,
          pilotHeadingTop: document.querySelector("#pageTitle")?.getBoundingClientRect().top
        };
      }
    };
  })()`);
}

async function main() {
  const client = new CdpClient(await getPageWsUrl());
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  await client.send("Log.enable");

  const result = {};
  await client.setViewport(1440, 900, false);
  await client.navigate(appUrl);
  await installPageHelpers(client);

  result.loading = await client.evaluate(`(async () => {
    await window.__phase5.waitFor(() => document.querySelector('[data-page="dataintake"]'));
    return {
      title: document.title,
      pageTitle: document.querySelector("#pageTitle")?.textContent || "",
      appHasContent: Boolean(document.querySelector("#app")?.children.length),
      safetyGlobal: typeof window.CMTPilotIntakeSafety === "object"
    };
  })()`);

  result.empty = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    return {
      pageTitle: document.querySelector("#pageTitle")?.textContent || "",
      hasPreview: Boolean(document.querySelector(".import-preview")),
      documentEmptyText: document.body.textContent.includes("No documents staged yet"),
      localDocumentEmptyText: document.body.textContent.includes("No local documents staged yet"),
      applyButtonPresent: Boolean(document.querySelector("[data-apply-import]")),
      headings: Array.from(document.querySelectorAll("h1,h2,h3")).slice(0, 8).map(el => el.textContent.trim()),
      labels: Array.from(document.querySelectorAll("label")).slice(0, 8).map(el => el.textContent.trim().replace(/\\s+/g, " ")),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  })()`);

  result.success = await client.evaluate(`(async () => {
    document.querySelector('[data-demo-import="workorders"]').click();
    await window.__phase5.waitFor(() => document.querySelector(".import-preview .badge")?.textContent.trim() === "Ready");
    return window.__phase5.previewSnapshot();
  })()`);

  result.afterApply = await client.evaluate(`(async () => {
    document.querySelector("[data-apply-import]").click();
    await window.__phase5.waitFor(() => !document.querySelector(".import-preview"));
    return {
      previewVisible: Boolean(document.querySelector(".import-preview")),
      importHistoryCount: window.__phase5.importHistoryCount(),
      importHistoryText: document.querySelector("[data-import-history-count]")?.textContent || ""
    };
  })()`);

  result.hostileCsv = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    window.__cmtXss = undefined;
    window.__fileXss = undefined;
    const csv = '<img src=x onerror=window.__cmtXss=1>,project,service_type,notes\\n<svg onload=window.__cmtXss=1>,Potomac Tower,Concrete,"Keep quotes, ampersands & Unicode \\u03a9"';
    await window.__phase5.uploadCsv(csv, '<img src=x onerror=window.__fileXss=1>.csv');
    const snapshot = window.__phase5.previewSnapshot();
    return {
      badge: snapshot.badge,
      applyDisabled: snapshot.applyDisabled,
      headerText: snapshot.headers[0],
      firstCell: snapshot.cells[0],
      preservesText: snapshot.text.includes("Keep quotes, ampersands & Unicode \\u03a9"),
      unsafeNodes: snapshot.unsafeNodes,
      globalCmtXss: Boolean(window.__cmtXss),
      globalFileXss: Boolean(window.__fileXss)
    };
  })()`);

  result.validHostileValues = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    window.__validValueXss = undefined;
    const headers = ["work_order", "project", "service_type", "required_certifications", "required_equipment", "priority", "status", "requested_start", "notes"];
    const row = ["TRD-107", "Potomac Tower", "Concrete", "ACI", "Slump kit", "High", "Scheduled", "8:00 AM", "<img src=x onerror=window.__validValueXss=1> javascript:alert(1) & Unicode \\u03a9"];
    const csv = headers.join(",") + "\\n" + row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(",");
    await window.__phase5.uploadCsv(csv, "valid-hostile-values.csv");
    const snapshot = window.__phase5.previewSnapshot();
    const notesIndex = snapshot.headers.indexOf("notes");
    return {
      badge: snapshot.badge,
      applyDisabled: snapshot.applyDisabled,
      notesCell: snapshot.cells[notesIndex],
      unsafeNodes: snapshot.unsafeNodes,
      globalValidValueXss: Boolean(window.__validValueXss)
    };
  })()`);

  result.malformed = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    const beforeHistoryCount = window.__phase5.importHistoryCount();
    await window.__phase5.uploadCsv('work_order,project,service_type\\n"TRD-104,Potomac,Concrete', 'malformed.csv');
    const snapshot = window.__phase5.previewSnapshot();
    return {
      badge: snapshot.badge,
      applyDisabled: snapshot.applyDisabled,
      errorVisible: /quote|parse/i.test(snapshot.text),
      beforeHistoryCount,
      afterHistoryCount: window.__phase5.importHistoryCount(),
      historyUnchanged: beforeHistoryCount === window.__phase5.importHistoryCount(),
      stagedRowsCopyHidden: !snapshot.text.includes("1 rows staged"),
      noImportedCopy: !/imported/i.test(snapshot.text),
      copyButtonLabel: document.querySelector(".intake-summary-card .primary-button")?.textContent.trim() || "",
      textSnippet: snapshot.text.slice(0, 240)
    };
  })()`);

  result.missingColumns = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    await window.__phase5.uploadCsv('work_order,project\\nTRD-104,Potomac', 'missing.csv');
    const snapshot = window.__phase5.previewSnapshot();
    return {
      badge: snapshot.badge,
      applyDisabled: snapshot.applyDisabled,
      missingServiceTypeVisible: snapshot.text.includes("service_type")
    };
  })()`);

  result.multipleMissingColumns = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    await window.__phase5.uploadCsv('work_order\\nTRD-104', 'multiple-missing.csv');
    const snapshot = window.__phase5.previewSnapshot();
    return {
      badge: snapshot.badge,
      applyDisabled: snapshot.applyDisabled,
      missingProjectVisible: snapshot.text.includes("project"),
      missingServiceTypeVisible: snapshot.text.includes("service_type"),
      missingEquipmentVisible: snapshot.text.includes("required_equipment")
    };
  })()`);

  result.partialData = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    const headers = ["work_order", "project", "service_type", "required_certifications", "required_equipment", "priority", "status", "requested_start", "notes"];
    const row = ["TRD-105", "", "Concrete", "ACI", "", "High", "Scheduled", "7:00 AM", '"Needs review & quotes"'];
    const csv = headers.join(",") + "\\n" + row.join(",");
    await window.__phase5.uploadCsv(csv, 'partial.csv');
    const snapshot = window.__phase5.previewSnapshot();
    return {
      badge: snapshot.badge,
      heading: snapshot.heading,
      applyDisabled: snapshot.applyDisabled,
      headers: snapshot.headers,
      cells: snapshot.cells,
      cleanupWarningVisible: /cleanup|missing/i.test(snapshot.text),
      needsCleanupSummaryVisible: snapshot.text.includes("1 need cleanup before dispatch decisions"),
      ampersandVisible: snapshot.text.includes("Needs review & quotes"),
      missingWarnings: (snapshot.text.match(/Missing column: [A-Za-z0-9_]+/g) || []),
      textSnippet: snapshot.text.slice(0, 360)
    };
  })()`);

  result.oversized = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    await window.__phase5.uploadCsv("work_order\\n" + "x".repeat(200001), "oversized.csv");
    const snapshot = window.__phase5.previewSnapshot();
    return {
      badge: snapshot.badge,
      applyDisabled: snapshot.applyDisabled,
      boundedMessage: /too large|200,000|characters/i.test(snapshot.text)
    };
  })()`);

  result.readErrorRecovery = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    const OriginalFileReader = window.FileReader;
    class FailingFileReader {
      constructor() {
        this.onerror = null;
        this.onload = null;
        this.error = new DOMException("Simulated read failure", "NotReadableError");
      }
      readAsText() {
        setTimeout(() => this.onerror && this.onerror({ target: this }), 0);
      }
    }
    window.FileReader = FailingFileReader;
    await window.__phase5.uploadCsv("work_order,project,service_type\\nTRD-106,Potomac,Concrete", "read-error.csv");
    const blocked = window.__phase5.previewSnapshot();
    window.FileReader = OriginalFileReader;
    document.querySelector('[data-demo-import="workorders"]').click();
    await window.__phase5.waitFor(() => document.querySelector(".import-preview .badge")?.textContent.trim() === "Ready");
    const recovered = window.__phase5.previewSnapshot();
    return {
      blocked: {
        badge: blocked.badge,
        applyDisabled: blocked.applyDisabled,
        readErrorVisible: /read|unable|failed/i.test(blocked.text)
      },
      recoveredBadge: recovered.badge,
      recoveredApplyDisabled: recovered.applyDisabled
    };
  })()`);

  result.documentMetadata = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    window.__docXss = undefined;
    const notesInput = document.querySelector("#documentNotesInput");
    notesInput.value = '<img src=x onerror=window.__docXss=1> notes & Unicode \\u03a9';
    notesInput.dispatchEvent(new Event("input", { bubbles: true }));
    const file = new File(["pdf"], '<script>window.__docXss=1</script>.pdf', { type: "application/pdf" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector("#documentUploadInput");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await window.__phase5.waitFor(() => document.querySelector("[data-document-index]"));
    return {
      filenameText: document.querySelector('[data-document-field="fileName"]')?.textContent,
      notesText: document.querySelector('[data-document-field="notes"]')?.textContent,
      unsafeNodes: document.querySelectorAll("[data-document-index] img,[data-document-index] svg,[data-document-index] script").length,
      globalDocXss: Boolean(window.__docXss)
    };
  })()`);

  result.pilotRequestConfirmation = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    window.__pilotRequestXss = undefined;
    const form = document.querySelector("[data-pilot-form]");
    form.elements.name.value = "Phase 7 Reviewer";
    form.elements.company.value = '<img src=x onerror=window.__pilotRequestXss=1>';
    form.elements.role.value = "Operations";
    form.elements.email.value = "phase7@example.test";
    form.elements.phone.value = "(555) 010-0000";
    form.elements.technicians.value = "12";
    form.elements.readinessProblem.value = "Quotes, ampersands & Unicode Ω should survive.";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await window.__phase5.waitFor(() => document.querySelector(".success-banner"));
    const banner = document.querySelector(".success-banner");
    return {
      bannerText: banner?.textContent || "",
      unsafeNodes: banner?.querySelectorAll("img,svg,script").length || 0,
      globalPilotXss: Boolean(window.__pilotRequestXss)
    };
  })()`);

  result.keyboardAndSemantics = await client.evaluate(`(() => {
    const previewButton = document.querySelector('[data-demo-import="workorders"]');
    previewButton.focus();
    return {
      focusedText: document.activeElement?.textContent.trim(),
      focusVisible: document.activeElement?.matches(":focus"),
      focusedTag: document.activeElement?.tagName,
      pageHeading: document.querySelector("#pageTitle")?.textContent,
      labels: Array.from(document.querySelectorAll("label")).map(label => label.textContent.trim().replace(/\\s+/g, " ")).filter(Boolean).slice(0, 12),
      sectionHeadings: Array.from(document.querySelectorAll("#app h2,#app h3")).slice(0, 10).map(el => el.textContent.trim())
    };
  })()`);

  result.wideViewport = await client.evaluate("window.__phase5.viewportSnapshot()");
  result.wideScreenshot = await client.screenshot("phase5-pilot-setup-wide-after.png");

  await client.setViewport(390, 844, true);
  result.narrowViewport = await client.evaluate("window.__phase5.viewportSnapshot()");
  result.narrowScreenshot = await client.screenshot("phase5-pilot-setup-narrow-after.png");

  await client.reload();
  await installPageHelpers(client);
  result.afterReload = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    return {
      hasPreview: Boolean(document.querySelector(".import-preview")),
      hasDocumentCard: Boolean(document.querySelector("[data-document-index]")),
      importHistoryCount: window.__phase5.importHistoryCount(),
      pageTitle: document.querySelector("#pageTitle")?.textContent
    };
  })()`);

  result.demoQa = await client.evaluate(`(async () => {
    await window.__phase5.openPage("demoqa");
    await window.__phase5.waitFor(() => document.querySelector("#pageTitle")?.textContent === "Demo Control Center");
    const utilityRow = Array.from(document.querySelectorAll(".qa-check-row"))
      .find(row => row.textContent.includes("Pilot Intake Safety utility"));
    return {
      pageTitle: document.querySelector("#pageTitle")?.textContent,
      includesReadyForDemo: document.body.textContent.includes("Ready for Demo"),
      includesPilotIntakeSafety: document.body.textContent.includes("Pilot Intake Safety utility"),
      pilotIntakeSafetyRowPass: utilityRow?.querySelector(".qa-status-badge")?.textContent.trim() === "Pass"
    };
  })()`);

  await client.setViewport(1440, 900, false);
  await client.navigate("http://127.0.0.1:8765/?ui=command");
  await installPageHelpers(client);
  result.commandMode = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    const modeSelect = document.querySelector("#uiModeSelect");
    modeSelect.value = "command";
    modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const beforeDark = document.body.classList.contains("theme-dark");
    document.querySelector("#themeToggle").click();
    const toggled = document.body.classList.contains("theme-dark") !== beforeDark;
    if (!document.body.classList.contains("theme-dark")) document.querySelector("#themeToggle").click();
    return {
      uiMode: document.documentElement.dataset.uiMode,
      bodyCommandMode: document.body.classList.contains("command-mode"),
      pageTitle: document.querySelector("#pageTitle")?.textContent,
      hasPreviewTemplate: Boolean(document.querySelector('[data-demo-import="workorders"]')),
      darkModeToggled: toggled
    };
  })()`);

  await client.setViewport(390, 844, true);
  result.commandDarkMobile = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    return {
      ...window.__phase5.viewportSnapshot(),
      bodyCommandMode: document.body.classList.contains("command-mode"),
      bodyThemeDark: document.body.classList.contains("theme-dark")
    };
  })()`);

  await client.navigate("http://127.0.0.1:8765/");
  await installPageHelpers(client);
  result.preferencePersistence = await client.evaluate(`(async () => {
    await window.__phase5.openPilot();
    return {
      afterReloadUiMode: document.documentElement.dataset.uiMode,
      afterReloadTheme: document.body.classList.contains("theme-dark") ? "dark" : "light",
      storedUiMode: localStorage.getItem("cmtcommand-ui-mode"),
      storedTheme: localStorage.getItem("cmtcommand-theme")
    };
  })()`);

  await client.navigate(appUrl);
  await installPageHelpers(client);
  result.trd104Workflow = await client.evaluate(`(async () => {
    await window.__phase5.openPage("command");
    document.querySelector('[data-open-coverage="TRD-104"]').click();
    await window.__phase5.waitFor(() => document.querySelector("#pageTitle")?.textContent === "Find Coverage");
    await window.__phase5.waitFor(() => document.querySelector('[data-demo-target="approve-coverage-plan"]'));
    const selectedCandidate = document.querySelector('[data-demo-target="maria-coverage-recommendation"]')?.textContent || "";
    document.querySelector('[data-demo-target="approve-coverage-plan"]').click();
    await window.__phase5.waitFor(() => document.body.textContent.includes("Maria Lopez Assigned") || document.body.textContent.includes("Maria Lopez"));
    await window.__phase5.openPage("decisionlog");
    const decisionLogText = document.body.textContent;
    await window.__phase5.openPage("pilotpack");
    const pilotMaterialsText = document.body.textContent;
    await window.__phase5.openPage("demoqa");
    await window.__phase5.waitFor(() => document.querySelector("#pageTitle")?.textContent === "Demo Control Center");
    const demoQaText = document.body.textContent;
    document.querySelector("[data-demo-full-reset-arm]")?.click();
    await window.__phase5.waitFor(() => document.querySelector("[data-demo-full-reset-confirm]"));
    document.querySelector("[data-demo-full-reset-confirm]")?.click();
    await window.__phase5.waitFor(() => document.querySelector("[data-demo-full-reset-arm]"));
    const resetText = document.body.textContent;
    return {
      selectedCandidateHasMaria: selectedCandidate.includes("Maria Lopez"),
      decisionLogHasMaria: decisionLogText.includes("TRD-104") && decisionLogText.includes("Maria Lopez"),
      operationalImpactVisible: decisionLogText.includes("Operational Impact After Decision") && decisionLogText.includes("TRD-104 Impact"),
      pilotMaterialsVisible: pilotMaterialsText.includes("Pilot Materials") && pilotMaterialsText.includes("Pilot Data Request"),
      demoQaReady: demoQaText.includes("Ready for Demo") && demoQaText.includes("Pilot Intake Safety utility"),
      fullResetReturnsUnapproved: resetText.includes("TRD-104 approval state") && resetText.includes("Not approved in current state")
    };
  })()`);

  result.consoleEvents = client.consoleEvents;
  result.networkFailures = client.networkFailures;
  result.consoleFailureCount = client.consoleEvents.length;
  result.networkFailureCount = client.networkFailures.length;

  client.close();
  validateResult(result);
  writeResult(result);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
