export interface DateRange {
  from: string;
  to: string;
}

export const EMPTY_DATE_RANGE: DateRange = { from: "", to: "" };

export function isWithinDateRange(
  date: Date | string,
  range: DateRange
): boolean {
  if (!range.from && !range.to) return true;
  const d = new Date(date);
  if (range.from) {
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    if (d < from) return false;
  }
  if (range.to) {
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    if (d > to) return false;
  }
  return true;
}

export function hasActiveDateRange(range: DateRange): boolean {
  return Boolean(range.from || range.to);
}
