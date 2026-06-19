import Image from "next/image";
import { cn } from "@/lib/utils";

/** Intrinsic dimensions of public/logo.png (transparent PNG) */
export const LOGO_WIDTH = 855;
export const LOGO_HEIGHT = 536;

interface BrandLogoProps {
  className?: string;
  /** Smaller mark for collapsed sidebar — same asset, scaled down */
  variant?: "full" | "compact";
  /** Boost visibility on dark surfaces (e.g. sidebar) */
  onDarkBackground?: boolean;
}

/**
 * TapTeck wordmark — transparent background, locked aspect ratio for crisp scaling.
 */
export function BrandLogo({
  className,
  variant = "full",
  onDarkBackground = false,
}: BrandLogoProps) {
  const isCompact = variant === "compact";

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 select-none",
        "aspect-[855/536] w-auto max-w-full",
        isCompact ? "h-8 min-h-8" : "h-9 min-h-9 sm:h-10",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="TapTeck"
        fill
        priority
        quality={100}
        sizes={isCompact ? "48px" : "(max-width: 768px) 120px, 150px"}
        className={cn(
          "object-contain object-center",
          onDarkBackground && "brightness-[1.85] contrast-[1.05]",
          "dark:brightness-[1.85] dark:contrast-[1.05]"
        )}
        draggable={false}
      />
    </span>
  );
}
