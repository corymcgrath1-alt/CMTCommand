(function initDemoShared(root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTDemoShared = api;
})(typeof window !== "undefined" ? window : globalThis, function buildDemoShared(root) {
  const STORAGE_PREFIX = "cmtcommand-";

  function getStorage() {
    try {
      return root?.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function formatTimestamp(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return String(value || "");
    return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function safeReadLocalStorage(key, fallback = "") {
    const storage = getStorage();
    if (!storage) return fallback;
    try {
      const value = storage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function safeReadJsonLocalStorage(key, fallback = {}) {
    const value = safeReadLocalStorage(key, "");
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function safeWriteLocalStorage(key, value) {
    const storage = getStorage();
    if (!storage) return false;
    try {
      storage.setItem(key, String(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeWriteJsonLocalStorage(key, value) {
    try {
      return safeWriteLocalStorage(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
  }

  function safeRemoveLocalStorage(key) {
    const storage = getStorage();
    if (!storage) return false;
    try {
      storage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getNamespacedStorageKeys(prefix = STORAGE_PREFIX) {
    const storage = getStorage();
    if (!storage) return [];
    const keys = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
    } catch (error) {
      return keys;
    }
    return keys.sort();
  }

  function getNamespacedStorageSnapshot(prefix = STORAGE_PREFIX) {
    return getNamespacedStorageKeys(prefix).reduce((snapshot, key) => {
      snapshot[key] = safeReadLocalStorage(key, "");
      return snapshot;
    }, {});
  }

  function normalizeSeverity(value) {
    const text = String(value || "").trim().toLowerCase();
    if (text === "critical") return "Critical";
    if (text === "high") return "High";
    if (text === "medium") return "Medium";
    if (text === "low") return "Low";
    return "Medium";
  }

  function formatStatusLabel(status) {
    const text = String(status || "").trim();
    const normalized = text.toLowerCase();
    if (normalized === "warn" || normalized === "warning") return "Warning";
    if (normalized === "fail" || normalized === "failed") return "Fail";
    if (normalized === "pass" || normalized === "passed") return "Pass";
    if (normalized === "ready") return "Ready";
    if (normalized === "at risk") return "At Risk";
    if (normalized === "not ready") return "Not Ready";
    if (normalized === "needs attention") return "Needs Attention";
    return text || "Needs Attention";
  }

  function getStatusBadgeClass(status) {
    const text = String(status || "").toLowerCase();
    if (/critical|fail|failed|not ready|broken|missing|bad|high risk/.test(text)) return "bad";
    if (/warn|warning|at risk|attention|review|medium|stale|pending/.test(text)) return "warn";
    if (/pass|passed|ready|approved|complete|good|current|low/.test(text)) return "good";
    return "info";
  }

  function createPlainTextSection(title, lines = []) {
    const body = (Array.isArray(lines) ? lines : [lines])
      .filter(line => line !== null && line !== undefined && String(line).trim())
      .map(line => String(line).trim());
    return [String(title || "").trim(), ...body].filter(Boolean).join("\n");
  }

  function normalizeCopyText(text) {
    return String(text || "").replace(/\r?\n/g, "\n").trim();
  }

  async function copyTextToClipboard(text, environment = {}) {
    const payload = normalizeCopyText(text);
    if (!payload) return { ok: false, method: "empty", text: payload };
    const clipboard = environment.clipboard || root?.navigator?.clipboard;
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(payload);
        return { ok: true, method: "clipboard", text: payload };
      } catch (error) {
        // Fall through to the local textarea fallback.
      }
    }
    const doc = environment.document || root?.document;
    if (!doc?.createElement || !doc.body) return { ok: false, method: "unavailable", text: payload };
    const input = doc.createElement("textarea");
    input.value = payload;
    input.setAttribute("readonly", "readonly");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    doc.body.appendChild(input);
    input.select();
    let ok = false;
    try {
      ok = Boolean(doc.execCommand && doc.execCommand("copy"));
    } catch (error) {
      ok = false;
    }
    input.remove();
    return { ok, method: "fallback", text: payload };
  }

  function getDemoTargetAttribute(targetId) {
    const target = String(targetId || "").trim();
    return target ? ` data-demo-target="${target.replaceAll('"', "&quot;")}"` : "";
  }

  function scrollToDemoTarget(targetId, doc = root?.document) {
    if (!targetId || !doc?.querySelector) return false;
    try {
      const target = doc.querySelector(`[data-demo-target="${String(targetId).replaceAll('"', '\\"')}"]`);
      if (!target) return false;
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      return true;
    } catch (error) {
      return false;
    }
  }

  return {
    STORAGE_PREFIX,
    formatTimestamp,
    formatStatusLabel,
    getStatusBadgeClass,
    normalizeSeverity,
    safeReadLocalStorage,
    safeReadJsonLocalStorage,
    safeWriteLocalStorage,
    safeWriteJsonLocalStorage,
    safeRemoveLocalStorage,
    getNamespacedStorageKeys,
    getNamespacedStorageSnapshot,
    createPlainTextSection,
    normalizeCopyText,
    copyTextToClipboard,
    getDemoTargetAttribute,
    scrollToDemoTarget
  };
});
