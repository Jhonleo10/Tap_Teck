"use client";

import { Button } from "@/components/ui/button";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

interface ExportButtonsProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  title?: string;
  columns?: { key: keyof T; label: string }[];
  showPdf?: boolean;
}

export function ExportButtons<T extends Record<string, unknown>>({
  data,
  filename,
  title,
  columns,
  showPdf = false,
}: ExportButtonsProps<T>) {
  const pdfTitle = title ?? filename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => exportToCSV(data, filename, columns)}
        disabled={data.length === 0}
      >
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => exportToExcel(data, filename, "Data", columns)}
        disabled={data.length === 0}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
      {showPdf && (
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => void exportToPDF(data, filename, pdfTitle, columns)}
        disabled={data.length === 0}
      >
          <FileText className="h-4 w-4" />
          PDF
        </Button>
      )}
    </div>
  );
}
