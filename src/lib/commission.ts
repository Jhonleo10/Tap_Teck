/** Resolve effective commission % — sub-service → service → platform default */
export function resolveCommissionRate(params: {
  defaultPercentage: number;
  servicePercentage?: number | null;
  subServicePercentage?: number | null;
}): number {
  const { defaultPercentage, servicePercentage, subServicePercentage } = params;
  if (subServicePercentage != null && !Number.isNaN(subServicePercentage)) {
    return clampCommission(subServicePercentage);
  }
  if (servicePercentage != null && !Number.isNaN(servicePercentage)) {
    return clampCommission(servicePercentage);
  }
  return clampCommission(defaultPercentage);
}

export function clampCommission(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function parseCommissionInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (Number.isNaN(num)) return null;
  return clampCommission(num);
}
