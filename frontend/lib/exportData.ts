/** Client-side CSV/Excel-friendly export. IDs stay in data but are omitted from files. */

const HIDDEN_EXPORT_KEYS = new Set([
  "id",
  "_id",
  "ID",
  "trade_date",
  "tradeDate",
  "createdAt",
  "updatedAt",
  "created_at",
  "updated_at",
]);

export type ExportColumn = {
  key: string;
  label?: string;
};

function shouldHideKey(key: string) {
  const k = key.toLowerCase();
  return (
    HIDDEN_EXPORT_KEYS.has(key) ||
    k === "id" ||
    k === "trade_date" ||
    k === "tradedate" ||
    k === "created_at" ||
    k === "updated_at" ||
    k === "createdat" ||
    k === "updatedat"
  );
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function resolveExportColumns(
  rows: Record<string, unknown>[],
  columns?: ExportColumn[]
): ExportColumn[] {
  if (columns?.length) {
    return columns.filter((col) => !shouldHideKey(col.key));
  }
  if (!rows.length) return [];
  return Object.keys(rows[0])
    .filter((key) => !shouldHideKey(key))
    .map((key) => ({
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
}

export function exportRowsToCsv(
  rows: Record<string, unknown>[],
  options?: {
    columns?: ExportColumn[];
    filename?: string;
  }
) {
  const columns = resolveExportColumns(rows, options?.columns);
  const header = columns.map((c) => escapeCsv(c.label || c.key)).join(",");
  const body = rows
    .map((row) =>
      columns.map((col) => escapeCsv(row[col.key])).join(",")
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options?.filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
