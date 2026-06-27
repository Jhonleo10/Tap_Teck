/** TapTeck design system tokens — align with landing & mobile apps */
export const brand = {
  primary: "#006F5F",
  secondary: "#0E8A72",
  accent: "#22C55E",
  background: "#F8FAFC",
  card: "#FFFFFF",
} as const;

export const chartPalette = [
  "#004D40",
  "#006F5F",
  "#0E8A72",
  "#14B8A6",
  "#22C55E",
  "#34D399",
  "#6EE7B7",
  "#F59E0B",
] as const;

export const statusColors = {
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  danger: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20" },
  info: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
} as const;

export const radii = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
} as const;

export const shadows = {
  soft: "0 1px 3px rgba(0, 111, 95, 0.06), 0 8px 24px rgba(0, 0, 0, 0.04)",
  elevated: "0 4px 16px rgba(0, 111, 95, 0.08), 0 12px 40px rgba(0, 0, 0, 0.06)",
  glow: "0 0 0 1px rgba(0, 111, 95, 0.08), 0 8px 32px rgba(0, 111, 95, 0.12)",
} as const;
