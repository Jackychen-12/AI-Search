/**
 * Beijing-time helpers. The site's editorial day/week is Beijing time — the
 * daily digest and the weekly insight must agree on it, otherwise a crawl at
 * 22:17 UTC (Sunday) labels the new BJ Monday's data as last week.
 */

const BJ_OFFSET_MS = 8 * 3600_000;

/** YYYY-MM-DD of `d` in Beijing time. */
export function bjDate(d = new Date()): string {
  return new Date(d.getTime() + BJ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Monday..Sunday (YYYY-MM-DD) of the Beijing-time week containing `now`. */
export function bjWeekRange(now = new Date()): { startDate: string; endDate: string } {
  const bj = new Date(now.getTime() + BJ_OFFSET_MS); // UTC fields == BJ wall clock
  const day = bj.getUTCDay();
  const mon = new Date(bj);
  mon.setUTCDate(bj.getUTCDate() - day + (day === 0 ? -6 : 1));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { startDate: mon.toISOString().slice(0, 10), endDate: sun.toISOString().slice(0, 10) };
}
