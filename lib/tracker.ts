export const START = "2026-09-28";
export const END = "2026-12-30";
export type Goal = { id: string; label: string; detail: string; icon: string; builtin: number; startDate: string; endDate: string | null; position: number };
export type Checkin = { date: string; goalId: string; checked: number };
export type TrackerData = { goals: Goal[]; checkins: Checkin[]; today: string };
export const DEFAULT_GOALS: Goal[] = [
  { id: "sleep", label: "8 hours of sleep", detail: "Recover. Recharge. Repeat.", icon: "moon", builtin: 1, startDate: START, endDate: null, position: 0 },
  { id: "breakfast", label: "Breakfast", detail: "Start your day fueled.", icon: "sunrise", builtin: 1, startDate: START, endDate: null, position: 1 },
  { id: "lunch", label: "Lunch", detail: "Keep your energy steady.", icon: "sun", builtin: 1, startDate: START, endDate: null, position: 2 },
  { id: "snack", label: "Snack", detail: "A little fuel between meals.", icon: "apple", builtin: 1, startDate: START, endDate: null, position: 3 },
  { id: "dinner", label: "Dinner", detail: "Finish the day nourished.", icon: "utensils", builtin: 1, startDate: START, endDate: null, position: 4 },
  { id: "dsa-daily", label: "2 DSA questions", detail: "Solve two questions and understand the approach.", icon: "target", builtin: 0, startDate: "2026-10-07", endDate: null, position: 5 },
  { id: "web-development-daily", label: "2 hours web development", detail: "Practice or build for two focused hours.", icon: "target", builtin: 0, startDate: "2026-10-07", endDate: null, position: 6 },
  { id: "self-study-daily", label: "2 hours self-study", detail: "Complete two hours of independent study.", icon: "target", builtin: 0, startDate: "2026-10-07", endDate: null, position: 7 },
  { id: "shower-daily", label: "Daily shower", detail: "Take a shower and reset for the day.", icon: "target", builtin: 0, startDate: "2026-10-07", endDate: null, position: 8 },
  { id: "bedtime-daily", label: "Sleep by 11 PM", detail: "Be asleep by 11:00 PM.", icon: "target", builtin: 0, startDate: "2026-10-07", endDate: null, position: 9 },
  { id: "client-outreach-daily", label: "Reach 5 potential website clients", detail: "Contact five prospects about your website services.", icon: "target", builtin: 0, startDate: "2026-10-07", endDate: null, position: 10 },
];
export function todayIST(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function shiftDate(date: string, amount: number) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); }
export const DATES: string[] = Array.from({ length: 94 }, (_, i) => shiftDate(START, i));
export function isChallengeDate(date: string) { return DATES.includes(date); }
export function activeGoals(goals: Goal[], date: string) { return goals.filter(g => g.startDate <= date && (!g.endDate || g.endDate >= date)); }
export function dayProgress(data: TrackerData, date: string) {
  const goals = activeGoals(data.goals, date), ids = new Set(data.checkins.filter(c => c.date === date && c.checked === 1).map(c => c.goalId));
  const done = goals.filter(g => ids.has(g.id)).length;
  return { done, total: goals.length, percent: goals.length ? Math.round(done / goals.length * 100) : 0, perfect: goals.length > 0 && done === goals.length };
}
export function overallProgress(data: TrackerData) {
  let done = 0, total = 0, dueTotal = 0, perfectDays = 0, loggedDays = 0;
  for (const date of DATES) { const d = dayProgress(data, date); total += d.total; if (date <= data.today) { done += d.done; dueTotal += d.total; perfectDays += Number(d.perfect); loggedDays += Number(d.done > 0); } }
  let end = data.today > END ? END : data.today;
  if (!dayProgress(data, end).perfect) end = shiftDate(end, -1);
  let streak = 0;
  for (let d = end; d >= START && dayProgress(data, d).perfect; d = shiftDate(d, -1)) streak++;
  return { done, total, dueTotal, perfectDays, loggedDays, streak, percent: total ? Math.round(done / total * 100) : 0, consistency: dueTotal ? Math.round(done / dueTotal * 100) : 0 };
}
