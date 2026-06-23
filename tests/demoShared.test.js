const assert = require("assert");
const shared = require("../demoShared.js");

function createMockStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] || null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    dump() {
      return Object.fromEntries(values);
    }
  };
}

assert.strictEqual(shared.formatStatusLabel("warn"), "Warning");
assert.strictEqual(shared.formatStatusLabel("Not Ready"), "Not Ready");
assert.strictEqual(shared.formatStatusLabel("needs attention"), "Needs Attention");
assert.strictEqual(shared.getStatusBadgeClass("Not Ready"), "bad");
assert.strictEqual(shared.getStatusBadgeClass("Needs Attention"), "warn");
assert.strictEqual(shared.getStatusBadgeClass("Ready"), "good");
assert.strictEqual(shared.normalizeSeverity("critical"), "Critical");
assert.strictEqual(shared.normalizeSeverity("unknown"), "Medium");

assert.strictEqual(
  shared.createPlainTextSection("Demo", [" Scheduled does not mean ready. ", "", "TRD-104"]),
  "Demo\nScheduled does not mean ready.\nTRD-104"
);
assert.strictEqual(shared.normalizeCopyText(" Hello\r\nWorld \n"), "Hello\nWorld");

const previousStorage = globalThis.localStorage;
const mockStorage = createMockStorage({
  "cmtcommand-theme": "dark",
  "cmtcommand-demo-walkthrough": JSON.stringify({ currentWalkthroughStepId: "scheduled-not-ready" }),
  "other-app": "do not touch"
});
globalThis.localStorage = mockStorage;

assert.strictEqual(shared.safeReadLocalStorage("cmtcommand-theme", "light"), "dark");
assert.deepStrictEqual(shared.safeReadJsonLocalStorage("cmtcommand-demo-walkthrough", {}).currentWalkthroughStepId, "scheduled-not-ready");
assert.strictEqual(shared.safeReadJsonLocalStorage("broken-json", { ok: true }).ok, true);
assert(shared.safeWriteJsonLocalStorage("cmtcommand-demo-control-checklist", { ready: true }));
assert.strictEqual(JSON.parse(mockStorage.getItem("cmtcommand-demo-control-checklist")).ready, true);
assert.deepStrictEqual(shared.getNamespacedStorageKeys(), [
  "cmtcommand-demo-control-checklist",
  "cmtcommand-demo-walkthrough",
  "cmtcommand-theme"
]);
assert.deepStrictEqual(Object.keys(shared.getNamespacedStorageSnapshot()), [
  "cmtcommand-demo-control-checklist",
  "cmtcommand-demo-walkthrough",
  "cmtcommand-theme"
]);
assert(shared.safeRemoveLocalStorage("cmtcommand-demo-control-checklist"));
assert.strictEqual(mockStorage.getItem("cmtcommand-demo-control-checklist"), null);
assert.strictEqual(mockStorage.getItem("other-app"), "do not touch");

let appendedInput = null;
const fallbackDocument = {
  body: {
    appendChild(node) {
      appendedInput = node;
    }
  },
  createElement() {
    return {
      value: "",
      style: {},
      setAttribute() {},
      select() {},
      remove() {
        appendedInput = null;
      }
    };
  },
  execCommand(command) {
    return command === "copy";
  }
};

shared.copyTextToClipboard(" Copy me ", { clipboard: null, document: fallbackDocument }).then(result => {
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.method, "fallback");
  assert.strictEqual(result.text, "Copy me");
  assert.strictEqual(appendedInput, null);
  globalThis.localStorage = previousStorage;
}).catch(error => {
  globalThis.localStorage = previousStorage;
  throw error;
});
