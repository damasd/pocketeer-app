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
