import { env } from "cloudflare:workers";
import { DEFAULT_GOALS, type Goal, type Checkin, todayIST } from "@/lib/tracker";
export function trackerDb() { if (!env.DB) throw new Error("Tracking database is unavailable"); return env.DB; }
export async function loadTracker(userId: string) {
  const db = trackerDb();
  await db.batch(DEFAULT_GOALS.map(g => db.prepare("INSERT OR IGNORE INTO goals (user_id,id,label,detail,icon,builtin,start_date,position) VALUES (?,?,?,?,?,?,?,?)").bind(userId,g.id,g.label,g.detail,g.icon,g.builtin,g.startDate,g.position)));
  const [goals, checkins] = await Promise.all([
    db.prepare("SELECT id,label,detail,icon,builtin,start_date AS startDate,end_date AS endDate,position FROM goals WHERE user_id = ? ORDER BY position,id").bind(userId).all<Goal>(),
    db.prepare("SELECT date,goal_id AS goalId,checked FROM checkins WHERE user_id = ? AND checked = 1 ORDER BY date").bind(userId).all<Checkin>(),
  ]);
  return { goals: goals.results, checkins: checkins.results, today: todayIST() };
}
