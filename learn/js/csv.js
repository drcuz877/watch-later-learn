/* RFC 4180 CSV parser. Quoted fields may contain commas, quotes, and newlines. */
(function (root) {
  function parseCSV(text) {
    if (text == null) return [];
    text = String(text);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const len = text.length;

    for (let i = 0; i < len; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
        continue;
      }

      if (c === '"') {
        inQuotes = true;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        continue;
      }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        continue;
      }
      field += c;
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function csvToObjects(text) {
    const table = parseCSV(text);
    if (!table.length) return [];
    const header = table[0].map((name) => String(name || "").trim());
    const out = [];
    for (let r = 1; r < table.length; r++) {
      const cells = table[r];
      if (!cells.some((cell) => cell !== "")) continue;
      const obj = {};
      for (let c = 0; c < header.length; c++) {
        if (!header[c]) continue;
        obj[header[c]] = cells[c] != null ? cells[c] : "";
      }
      out.push(obj);
    }
    return out;
  }

  root.parseCSV = parseCSV;
  root.csvToObjects = csvToObjects;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseCSV, csvToObjects };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
