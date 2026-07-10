const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const safety = require("../pilotIntakeSafety.js");

const repoRoot = path.join(__dirname, "..");
const utilitySource = fs.readFileSync(path.join(repoRoot, "pilotIntakeSafety.js"), "utf8");
const browserSandbox = { window: {} };
vm.runInNewContext(utilitySource, browserSandbox);
assert.strictEqual(typeof browserSandbox.window.CMTPilotIntakeSafety.parseCsv, "function");

const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const demoSharedIndex = indexHtml.indexOf("demoShared.js");
const pilotSafetyIndex = indexHtml.indexOf("pilotIntakeSafety.js");
const demoControlIndex = indexHtml.indexOf("demoControlCenter.js");
const appIndex = indexHtml.indexOf("app.js");
assert(demoSharedIndex > -1 && pilotSafetyIndex > demoSharedIndex);
assert(demoControlIndex > pilotSafetyIndex);
assert(appIndex > demoControlIndex);

function mockDocument() {
  return {
    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        children: [],
        className: "",
        textContent: "",
        attributes: {},
        appendChild(child) {
          this.children.push(child);
          return child;
        },
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        }
      };
    }
  };
}

const validCsv = "\ufeffwork_order,project,notes\r\nTRD-104,\"Potomac, Garage\",\"Line 1\nLine 2\"\r\nTRD-105,\"Quote \"\"inside\"\"\",\"cafe & 東京\"";
const valid = safety.parseCsv(validCsv);
assert.deepStrictEqual(valid.errors, []);
assert.strictEqual(valid.rows.length, 2);
assert.strictEqual(valid.rows[0].work_order, "TRD-104");
assert.strictEqual(valid.rows[0].project, "Potomac, Garage");
assert.strictEqual(valid.rows[0].notes, "Line 1\nLine 2");
assert.strictEqual(valid.rows[1].project, "Quote \"inside\"");
assert.strictEqual(valid.rows[1].notes, "cafe & 東京");

const hostileHeader = "<img src=x onerror=window.__cmtXss=1>";
const hostile = safety.parseCsv(`work_order,${hostileHeader}\nTRD-104,<svg onload=alert(1)>`);
assert.deepStrictEqual(hostile.errors, []);
assert.strictEqual(hostile.columns[1].displayName, hostileHeader);
assert.strictEqual(hostile.rows[0][hostile.columns[1].key], "<svg onload=alert(1)>");

const doc = mockDocument();
const root = doc.createElement("div");
const child = safety.appendTextElement(doc, root, "span", hostileHeader, "badge warn");
assert.strictEqual(child.textContent, hostileHeader);
assert.strictEqual(child.className, "badge warn");
assert.strictEqual(root.children[0], child);
assert.throws(() => safety.appendTextElement(doc, root, "script", "alert(1)"), /Unsafe text element tag/);

const prototypeHeaders = safety.parseCsv("__proto__,constructor,toString\npolluted,ctor,stringer");
assert.strictEqual(Object.prototype.hasOwnProperty.call(prototypeHeaders.rows[0], "__proto__"), true);
assert.strictEqual(prototypeHeaders.rows[0].__proto__, "polluted");
assert.strictEqual(prototypeHeaders.rows[0].constructor, "ctor");
assert.strictEqual(prototypeHeaders.rows[0].tostring, "stringer");
assert.strictEqual({}.polluted, undefined);
assert.strictEqual(
  safety.validateImport({ label: "Prototype", requiredColumns: ["__proto__", "constructor", "toString"] }, prototypeHeaders).blocked,
  false
);

const duplicateHeaders = safety.parseCsv("work_order,work_order,project\nTRD-104,TRD-105,Potomac");
assert(duplicateHeaders.headerWarnings.some(warning => /Duplicate header "work_order"/.test(warning)));
assert.strictEqual(duplicateHeaders.columns[0].key, "work_order");
assert.strictEqual(duplicateHeaders.columns[1].key, "work_order__2");

const missingColumns = safety.validateImport(
  { label: "Work Orders", requiredColumns: ["work_order", "project", "service_type"] },
  safety.parseCsv("work_order,project\nTRD-104,Potomac")
);
assert.strictEqual(missingColumns.blocked, true);
assert.deepStrictEqual(missingColumns.missingColumns, ["service_type"]);

const blankAndDuplicate = safety.validateImport(
  { label: "Work Orders", requiredColumns: ["work_order", "project"] },
  safety.parseCsv("work_order,project\nTRD-104,\nTRD-104,")
);
assert.strictEqual(blankAndDuplicate.blocked, false);
assert(blankAndDuplicate.rowWarnings.some(warning => warning === "Row 1: missing project"));
assert(blankAndDuplicate.rowWarnings.some(warning => warning === "Row 2: missing project"));
assert(blankAndDuplicate.duplicateWarnings.some(warning => /possible duplicate Work Orders/.test(warning)));

const malformed = safety.parseCsv("work_order,project\n\"TRD-104,Potomac");
assert(malformed.errors.some(error => /Unmatched quote/.test(error)));
assert.strictEqual(safety.validateImport({ label: "Work Orders", requiredColumns: ["work_order"] }, malformed).blocked, true);

const explicitError = safety.createErrorParseResult("CSV file could not be read.");
assert.strictEqual(safety.validateImport({ label: "Work Orders", requiredColumns: ["work_order"] }, explicitError).blocked, true);

const invalidLimitFallback = safety.parseCsv("work_order\nTRD-104", { maxCharacters: "not-a-number" });
assert.deepStrictEqual(invalidLimitFallback.errors, []);

const oversized = safety.parseCsv(`work_order\n${"x".repeat(safety.MAX_CSV_CHARACTERS + 1)}`);
assert(oversized.errors.some(error => /too large/.test(error)));
assert.deepStrictEqual(oversized.rows, []);

const formulaCsv = safety.rowsToCsv([
  {
    formula: "=CMD()",
    plus: "+SUM(A1:A2)",
    minus: "-1+2",
    at: "@HYPERLINK",
    tab: "\t=cmd",
    cr: "\r=cmd",
    normal: "Quotes \" ampersand & unicode 東京"
  }
], ["formula", "plus", "minus", "at", "tab", "cr", "normal"]);
assert(formulaCsv.includes("'=CMD()"));
assert(formulaCsv.includes("'+SUM(A1:A2)"));
assert(formulaCsv.includes("'-1+2"));
assert(formulaCsv.includes("'@HYPERLINK"));
assert(formulaCsv.includes("\"'\t=cmd\""));
assert(formulaCsv.includes("\"'\r=cmd\""));
assert(formulaCsv.includes("\"Quotes \"\" ampersand & unicode 東京\""));

assert.strictEqual(safety.isAllowedUrl("javascript:alert(1)"), false);
assert.strictEqual(safety.isAllowedUrl("data:text/html,<script>1</script>"), false);
assert.strictEqual(safety.isAllowedUrl("blob:http://127.0.0.1/example"), true);
assert.strictEqual(safety.isAllowedUrl("https://example.test/file.csv"), true);

console.log("pilotIntakeSafety tests passed");
