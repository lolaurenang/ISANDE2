/**
 * Minimal CSV writer - no dependency needed for what is, at heart,
 * string joining with an escaping rule.
 *
 * A field is quoted when it contains a comma, a quote or a newline, and
 * embedded quotes are doubled. That is the whole of RFC 4180 that
 * matters here.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<object>} rows
 */
export function toCsv(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));

  // BOM so Excel opens UTF-8 names (ñ, é) correctly instead of mojibake.
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}

/** Sends a CSV as a browser download. */
export function sendCsv(res, filename, columns, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(columns, rows));
}

/** report-name_2026-08-01_to_2026-08-31.csv */
export function reportFilename(name, from, to) {
  return `andoys_${name}_${from}_to_${to}.csv`;
}
