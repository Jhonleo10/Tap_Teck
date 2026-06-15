"use client";

import { Button } from "@/components/ui/button";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { Download, FileSpreadsheet } from "lucide-react";

interface ExportButtonsProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  columns?: { key: keyof T; label: string }[];
}

export function ExportButtons<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
}: ExportButtonsProps<T>) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(data, filename, columns)}
        disabled={data.length === 0}
      >
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToExcel(data, filename, "Data", columns)}
        disabled={data.length === 0}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
