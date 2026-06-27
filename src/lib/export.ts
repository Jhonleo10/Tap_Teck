import * as XLSX from "xlsx";

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const keys = columns
    ? columns.map((c) => c.key)
    : (Object.keys(data[0]) as (keyof T)[]);
  const headers = columns
    ? columns.map((c) => c.label)
    : keys.map(String);

  const rows = data.map((row) =>
    keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })
  );

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  downloadBlob(
    new Blob([csvContent], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`
  );
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = "Sheet1",
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const exportData = columns
    ? data.map((row) =>
        Object.fromEntries(columns.map((c) => [c.label, row[c.key]]))
      )
    : data;

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/** Dynamic import avoids SSR / bundle issues in Next.js */
export async function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  title: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const keys = columns
    ? columns.map((c) => c.key)
    : (Object.keys(data[0]) as (keyof T)[]);
  const headers = columns
    ? columns.map((c) => c.label)
    : keys.map(String);

  const rows = data.map((row) =>
    keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })
  );

  const doc = new jsPDF({ orientation: keys.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()} · ${data.length} rows`, 14, 23);
  doc.setTextColor(0);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 111, 95] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
