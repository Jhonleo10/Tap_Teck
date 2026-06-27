import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-5",
        hover && "card-hover-lift",
        className
      )}
    >
      {children}
    </div>
  );
}
