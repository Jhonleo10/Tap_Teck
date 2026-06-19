"use client";

import { useState } from "react";
import { Download, ExternalLink, ZoomIn, ZoomOut, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string | null;
  documentNumber?: string | null;
}

function isPdfUrl(url: string) {
  return /\.pdf($|\?)/i.test(url) || url.includes("application/pdf");
}

export function DocumentViewer({
  open,
  onOpenChange,
  title,
  url,
  documentNumber,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleOpenChange = (next: boolean) => {
    if (!next) setZoom(100);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {documentNumber && (
                <p className="mt-1 text-sm text-muted-foreground">{documentNumber}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                {zoom}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {url && (
                <>
                  <Button variant="outline" size="sm" className="rounded-lg" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg" asChild>
                    <a href={url} download>
                      <Download className="mr-1.5 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-5rem)] overflow-auto bg-muted/30 p-6">
          {!url ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="mb-3 h-12 w-12 opacity-40" />
              <p>No document uploaded yet</p>
            </div>
          ) : isPdfUrl(url) ? (
            <iframe
              src={url}
              title={title}
              className="h-[min(70vh,600px)] w-full rounded-xl border border-border/50 bg-white"
            />
          ) : (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={title}
                className={cn(
                  "max-w-full rounded-xl border border-border/50 bg-white shadow-sm transition-transform duration-200",
                )}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
