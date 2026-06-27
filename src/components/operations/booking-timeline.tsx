"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingTimelineStep } from "@/services/booking-operations.service";

export function BookingTimeline({ steps }: { steps: BookingTimelineStep[] }) {
  return (
    <div className="relative space-y-0 pl-1">
      <div className="absolute left-[0.9rem] top-2 bottom-2 w-px bg-border" />
      {steps.map((step, i) => (
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="relative flex gap-3 pb-4 last:pb-0"
        >
          <div
            className={cn(
              "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-background",
              step.completed
                ? "border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]"
                : step.current
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted text-muted-foreground"
            )}
          >
            {step.completed ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-current opacity-50" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={cn(
                "text-sm font-medium",
                step.current && "text-primary",
                !step.completed && !step.current && "text-muted-foreground"
              )}
            >
              {step.label}
            </p>
            {step.timestamp && step.completed && (
              <p className="text-xs text-muted-foreground">
                {new Date(step.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
