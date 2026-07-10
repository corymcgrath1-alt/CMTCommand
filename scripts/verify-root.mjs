import fs from "node:fs";
import { spawnSync } from "node:child_process";

const syntaxFiles = [
  "demoShared.js",
  "pilotIntakeSafety.js",
  "demoControlCenter.js",
  "pilotReadinessPack.js",
  "demoWalkthrough.js",
  "operationalImpact.js",
  "operationalCompression.js",
  "app.js"
];

const testFiles = [
  "tests/demoShared.test.js",
  "tests/pilotIntakeSafety.test.js",
  "tests/demoControlCenter.test.js",
  "tests/pilotReadinessPack.test.js",
  "tests/demoWalkthrough.test.js",
  "tests/operationalImpact.test.js",
  "tests/operationalCompression.test.js"
];

const whitespaceFiles = [
  ".github/workflows/root-static-checks.yml",
  "AGENTS.md",
  "README.md",
  "DEVELOPER_NOTES.md",
  "scripts/verify-root.mjs",
  "index.html",
  "app.js",
  "styles.css",
  ...syntaxFiles,
  ...testFiles
];

function run(args) {
  const command = [process.execPath, ...args].join(" ");
  console.log(`\n> ${command}`);
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function checkTrailingWhitespace(files) {
  const failures = [];
  const uniqueFiles = [...new Set(files)];
  for (const file of uniqueFiles) {
    const text = fs.readFileSync(file, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (/[ \t]$/.test(line)) failures.push(`${file}:${index + 1}`);
    });
  }
  if (failures.length) {
    console.error("\nTrailing whitespace found:");
    failures.forEach(failure => console.error(`  ${failure}`));
    process.exit(1);
  }
}

checkTrailingWhitespace(whitespaceFiles);
for (const file of syntaxFiles) run(["--check", file]);
for (const file of testFiles) run([file]);

console.log("\nRoot static verification passed.");
