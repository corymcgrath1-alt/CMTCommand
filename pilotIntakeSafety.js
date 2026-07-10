(function initPilotIntakeSafety(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CMTPilotIntakeSafety = api;
})(typeof window !== "undefined" ? window : globalThis, function buildPilotIntakeSafety() {
  const MAX_CSV_CHARACTERS = 200000;
  const FORMULA_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r"]);
  const DEFAULT_ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:", "blob:"];
  const SAFE_TEXT_TAGS = new Set(["span", "strong", "em", "small", "p", "div", "li", "dt", "dd", "th", "td"]);

  function toText(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function removeBom(value) {
    const text = toText(value);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  function canonicalHeader(value) {
    return removeBom(value).trim().toLowerCase().replace(/\s+/g, "_");
  }

  function makeEmptyParseResult(errors = []) {
    return {
      rows: [],
      columns: [],
      rawHeaders: [],
      headerWarnings: [],
      errors
    };
  }

  function createErrorParseResult(errors = []) {
    return makeEmptyParseResult(Array.isArray(errors) ? errors.map(toText) : [toText(errors)]);
  }

  function setRecordValue(record, key, value) {
    Object.defineProperty(record, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return record;
  }

  function pushCsvRow(rows, row) {
    if (row.some(value => value !== "")) rows.push(row);
  }

  function buildColumns(headerRow = []) {
    const seen = Object.create(null);
    const headerWarnings = [];
    const columns = headerRow.map((header, index) => {
      const displayName = index === 0 ? removeBom(header) : toText(header);
      const canonicalName = canonicalHeader(displayName) || `column_${index + 1}`;
      seen[canonicalName] = (seen[canonicalName] || 0) + 1;
      if (seen[canonicalName] > 1) {
        headerWarnings.push(`Duplicate header "${displayName}" was renamed to ${canonicalName}__${seen[canonicalName]}.`);
      }
      return {
        index,
        displayName,
        canonicalName,
        key: seen[canonicalName] === 1 ? canonicalName : `${canonicalName}__${seen[canonicalName]}`
      };
    });
    return { columns, headerWarnings };
  }

  function parseCsv(text, options = {}) {
    const source = toText(text);
    const requestedMax = Number(options.maxCharacters || MAX_CSV_CHARACTERS);
    const maxCharacters = Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : MAX_CSV_CHARACTERS;
    if (source.length > maxCharacters) {
      return makeEmptyParseResult([`CSV file is too large for local preview (${source.length} characters; limit ${maxCharacters}).`]);
    }

    const parsedRows = [];
    const errors = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (quoted) {
        if (char === "\"" && next === "\"") {
          cell += "\"";
          index += 1;
        } else if (char === "\"") {
          quoted = false;
        } else {
          cell += char;
        }
        continue;
      }

      if (char === "\"" && cell === "") {
        quoted = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        pushCsvRow(parsedRows, row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (quoted) errors.push("Unmatched quote in CSV input.");
    row.push(cell);
    pushCsvRow(parsedRows, row);

    if (!parsedRows.length) return makeEmptyParseResult(["CSV file is empty."]);

    const rawHeaders = parsedRows[0].map((header, index) => index === 0 ? removeBom(header) : toText(header));
    const { columns, headerWarnings } = buildColumns(rawHeaders);
    const rows = parsedRows.slice(1).map(values => columns.reduce((acc, column) => {
      setRecordValue(acc, column.key, values[column.index] ?? "");
      return acc;
    }, {}));

    return {
      rows,
      columns,
      rawHeaders,
      headerWarnings,
      errors
    };
  }

  function normalizeParseResult(input) {
    if (!Array.isArray(input)) {
      if (!input) return makeEmptyParseResult(["No CSV parse result was provided."]);
      if (!Array.isArray(input.rows) || !Array.isArray(input.columns)) {
        return makeEmptyParseResult(["Invalid CSV parse result was provided."]);
      }
      return {
        rows: input.rows,
        columns: input.columns,
        rawHeaders: Array.isArray(input.rawHeaders) ? input.rawHeaders : [],
        headerWarnings: Array.isArray(input.headerWarnings) ? input.headerWarnings : [],
        errors: Array.isArray(input.errors) ? input.errors : []
      };
    }
    const rawHeaders = Object.keys(input[0] || {});
    const { columns, headerWarnings } = buildColumns(rawHeaders);
    return {
      rows: input,
      columns,
      rawHeaders,
      headerWarnings,
      errors: []
    };
  }

  function createParseResultFromRows(rows = [], headers = []) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const rawHeaders = headers.length ? headers.map(toText) : Object.keys(safeRows[0] || {});
    const { columns, headerWarnings } = buildColumns(rawHeaders);
    const normalizedRows = safeRows.map(row => columns.reduce((acc, column) => {
      setRecordValue(acc, column.key, row[column.displayName] ?? row[column.canonicalName] ?? row[column.key] ?? "");
      return acc;
    }, {}));
    return {
      rows: normalizedRows,
      columns,
      rawHeaders,
      headerWarnings,
      errors: []
    };
  }

  function validateImport(config = {}, parseResultOrRows = {}) {
    const parseResult = normalizeParseResult(parseResultOrRows);
    const requiredColumns = Array.isArray(config.requiredColumns) ? config.requiredColumns : [];
    const required = requiredColumns.map(column => ({
      displayName: column,
      canonicalName: canonicalHeader(column)
    }));
    const columnsByCanonical = parseResult.columns.reduce((acc, column) => {
      if (!acc[column.canonicalName]) acc[column.canonicalName] = column;
      return acc;
    }, Object.create(null));
    const missingColumns = required
      .filter(column => !columnsByCanonical[column.canonicalName])
      .map(column => column.displayName);
    const rowWarnings = [];
    const duplicateWarnings = [];
    const seen = new Set();

    parseResult.rows.forEach((row, rowIndex) => {
      required.forEach(column => {
        const actualColumn = columnsByCanonical[column.canonicalName];
        if (actualColumn && !toText(row[actualColumn.key]).trim()) {
          rowWarnings.push(`Row ${rowIndex + 1}: missing ${column.displayName}`);
        }
      });
      const key = required.map(column => {
        const actualColumn = columnsByCanonical[column.canonicalName];
        return actualColumn ? toText(row[actualColumn.key]).trim().toLowerCase() : "";
      }).join("|");
      if (!key.trim()) return;
      if (seen.has(key)) {
        duplicateWarnings.push(`Row ${rowIndex + 1}: possible duplicate ${config.label || "import rows"}`);
      } else {
        seen.add(key);
      }
    });

    const parseErrors = Array.isArray(parseResult.errors) ? parseResult.errors : [];
    const headerWarnings = Array.isArray(parseResult.headerWarnings) ? parseResult.headerWarnings : [];
    return {
      missingColumns,
      rowWarnings,
      duplicateWarnings,
      headerWarnings,
      parseErrors,
      blocked: Boolean(parseErrors.length || missingColumns.length),
      warnings: [...headerWarnings, ...rowWarnings, ...duplicateWarnings],
      columns: parseResult.columns
    };
  }

  function neutralizeSpreadsheetFormula(value) {
    const text = toText(value);
    return FORMULA_PREFIXES.has(text[0]) ? `'${text}` : text;
  }

  function csvEscape(value) {
    const text = neutralizeSpreadsheetFormula(value);
    return /[",\r\n\t]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  }

  function rowsToCsv(rows = [], columns = []) {
    const safeColumns = columns.map(toText);
    return [
      safeColumns.map(csvEscape).join(","),
      ...rows.map(row => safeColumns.map(column => csvEscape(row[column])).join(","))
    ].join("\n");
  }

  function setTextContent(element, value) {
    if (element) element.textContent = toText(value);
    return element;
  }

  function appendTextElement(doc, parent, tagName, value, className = "") {
    const safeTagName = toText(tagName).toLowerCase();
    if (!SAFE_TEXT_TAGS.has(safeTagName)) {
      throw new Error(`Unsafe text element tag: ${toText(tagName)}`);
    }
    const element = doc.createElement(safeTagName);
    if (className) element.className = className;
    element.textContent = toText(value);
    if (parent) parent.appendChild(element);
    return element;
  }

  function isAllowedUrl(value, allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS) {
    const text = toText(value).trim();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) return false;
    try {
      return allowedProtocols.includes(new URL(text).protocol);
    } catch (error) {
      return false;
    }
  }

  function normalizeDocumentRecord(input = {}) {
    return {
      fileName: toText(input.fileName),
      type: toText(input.type),
      project: toText(input.project),
      technician: toText(input.technician),
      equipment: toText(input.equipment),
      uploadDate: toText(input.uploadDate),
      status: toText(input.status || "Needs review"),
      notes: toText(input.notes)
    };
  }

  return {
    MAX_CSV_CHARACTERS,
    DEFAULT_ALLOWED_PROTOCOLS,
    parseCsv,
    createErrorParseResult,
    validateImport,
    createParseResultFromRows,
    rowsToCsv,
    csvEscape,
    neutralizeSpreadsheetFormula,
    setTextContent,
    appendTextElement,
    isAllowedUrl,
    normalizeDocumentRecord
  };
});
