// Pay periods (brief: Core concepts). A period starts on the 25th, or the next weekday when the
// 25th falls on a weekend, and ends the day before the next one starts. It is named after the
// month it ends in: 25 Nov – 24 Dec is "December". Dates are local YYYY-MM-DD strings.
// Slice 7 stores periods so their dates can be edited for holidays; this is the generated rule.

export type Period = {
  start: string; // first day, inclusive
  end: string; // last day, inclusive
  /** Month it ends in, e.g. "December"; "December 2025" when not the current year. */
  name: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function parse(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Start of the period that begins in this month (month0 is 0-based; overflow is fine). */
export function periodStartIn(year: number, month0: number): Date {
  const d = new Date(year, month0, 25);
  const day = d.getDay(); // 0 Sun, 6 Sat
  if (day === 6) d.setDate(27); // Saturday -> Monday
  if (day === 0) d.setDate(26); // Sunday -> Monday
  return d;
}

function build(year: number, month0: number, currentYear: number): Period {
  const start = periodStartIn(year, month0);
  const nextStart = periodStartIn(year, month0 + 1);
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1);
  const month = MONTHS[end.getMonth()];
  return {
    start: iso(start),
    end: iso(end),
    name: end.getFullYear() === currentYear ? month : `${month} ${end.getFullYear()}`,
  };
}

/** The period containing this date. */
export function periodFor(isoDate: string, currentYear = new Date().getFullYear()): Period {
  const d = parse(isoDate);
  const thisMonth = periodStartIn(d.getFullYear(), d.getMonth());
  return d >= thisMonth
    ? build(d.getFullYear(), d.getMonth(), currentYear)
    : build(d.getFullYear(), d.getMonth() - 1, currentYear);
}

/** Every period from the one containing `from` to the one containing `to`, newest first. */
export function periodsBetween(from: string, to: string, currentYear = new Date().getFullYear()): Period[] {
  const list: Period[] = [];
  let p = periodFor(to, currentYear);
  const first = periodFor(from, currentYear).start;
  while (p.start >= first) {
    list.push(p);
    const before = parse(p.start);
    before.setDate(before.getDate() - 1);
    p = periodFor(iso(before), currentYear);
  }
  return list;
}

/** "25 Nov – 24 Dec" */
export function periodRangeLabel(p: Pick<Period, "start" | "end">): string {
  const s = parse(p.start);
  const e = parse(p.end);
  return `${s.getDate()} ${SHORT[s.getMonth()]} – ${e.getDate()} ${SHORT[e.getMonth()]}`;
}

export function inPeriod(isoDate: string, p: Pick<Period, "start" | "end">): boolean {
  return isoDate >= p.start && isoDate <= p.end;
}

// ---- Stored periods (slice 7). The database keeps one row per period; only start days are
// edited by hand, so the list is rebuilt from the start days: each period ends the day before
// the next one starts, and the newest one ends where the 25th rule says.

const addDays = (isoDate: string, days: number) => {
  const d = parse(isoDate);
  d.setDate(d.getDate() + days);
  return iso(d);
};

/** Year-month of a start day; a period keeps its month when its start is moved for a holiday. */
export const startMonth = (isoDate: string) => isoDate.slice(0, 7);

/** Rule start of the period after the one starting on `start` (the next month's 25th rule). */
export function nextRuleStart(start: string): string {
  const d = parse(start);
  return iso(periodStartIn(d.getFullYear(), d.getMonth() + 1));
}

/** Periods from their start days (any order, duplicates ignored), newest first. */
export function buildPeriods(starts: readonly string[], currentYear = new Date().getFullYear()): Period[] {
  const sorted = [...new Set(starts)].sort();
  const list = sorted.map((start, i) => {
    const end = addDays(i + 1 < sorted.length ? sorted[i + 1] : nextRuleStart(start), -1);
    const e = parse(end);
    const month = MONTHS[e.getMonth()];
    return { start, end, name: e.getFullYear() === currentYear ? month : `${month} ${e.getFullYear()}` };
  });
  return list.reverse();
}

/**
 * Rule start days needed so that every date from `from` to `to` falls in a period,
 * skipping months that already have a (possibly hand-edited) start.
 */
export function missingStarts(existing: readonly string[], from: string, to: string): string[] {
  const have = new Set(existing.map(startMonth));
  return periodsBetween(from, to)
    .map((p) => p.start)
    .filter((s) => !have.has(startMonth(s)))
    .sort();
}

/** Allowed range for a hand-edited start: inside its own month and strictly between its neighbours. */
export function startDayLimits(
  start: string,
  prevStart: string | null,
  nextStart: string | null,
): { min: string; max: string } {
  const d = parse(start);
  const first = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const afterPrev = prevStart ? addDays(prevStart, 1) : first;
  const beforeNext = nextStart ? addDays(nextStart, -1) : last;
  return { min: afterPrev > first ? afterPrev : first, max: beforeNext < last ? beforeNext : last };
}

/** How many pay periods from the one starting `fromStart` up to the one containing `date`, at least 1. */
export function periodsUntil(fromStart: string, date: string): number {
  if (date < fromStart) return 1;
  return Math.max(1, periodsBetween(fromStart, date).length);
}
