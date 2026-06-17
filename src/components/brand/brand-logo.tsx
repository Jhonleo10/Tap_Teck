import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** compact square mark for collapsed sidebar */
  variant?: "full" | "compact";
}

/**
 * Exact TapTeck brand logo (PNG). White surface keeps the logo crisp and
 * visible on dark sidebar and light/dark themes without altering the asset.
 */
export function BrandLogo({ className, variant = "full" }: BrandLogoProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5",
        isCompact ? "h-10 w-10 p-1.5" : "h-10 min-w-0 px-3",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="TapTeck"
        width={isCompact ? 32 : 128}
        height={isCompact ? 32 : 36}
        className={cn(
          "object-contain",
          isCompact ? "h-full w-full" : "h-7 w-auto max-w-[128px]"
        )}
        priority
      />
    </div>
  );
}
