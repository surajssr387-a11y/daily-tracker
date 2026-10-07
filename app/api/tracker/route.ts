import { getChatGPTUser } from "@/app/chatgpt-auth";
import { loadTracker, trackerDb } from "@/db/tracker";
import { START, END, activeGoals, isChallengeDate, shiftDate, todayIST, type Goal } from "@/lib/tracker";
import { z } from "zod";
export const dynamic = "force-dynamic";
const label = z.string().trim().min(1).max(60);
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check"), date: z.string(), goalId: z.string().max(80), checked: z.boolean() }).strict(),
  z.object({ action: z.literal("add"), label, detail: z.string().trim().max(100), startDate: z.string() }).strict(),
  z.object({ action: z.literal("edit"), goalId: z.string().max(80), label, detail: z.string().trim().max(100) }).strict(),
  z.object({ action: z.literal("archive"), goalId: z.string().max(80) }).strict(),
]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const user = await getChatGPTUser(); if (!user) return json({ error: "Sign in with ChatGPT to load your tracker.", signIn: true }, 401);
  try { return json(await loadTracker(user.userId)); } catch (e) { console.error("Tracker load failed", e); return json({ error: "Could not load your progress. Please retry." }, 503); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return json({ error: "Sign in with ChatGPT to save your progress.", signIn: true }, 401);
  const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) return json({ error: "This request is not allowed." }, 403);
  let body; try { body = command.parse(await request.json()); } catch { return json({ error: "Check the goal name and date, then try again." }, 400); }
  try {
    const db = trackerDb(), today = todayIST();
    if (body.action === "add") {
      if (!isChallengeDate(body.startDate) || body.startDate > today) return json({ error: "Choose a start date within the challenge, up to today." }, 400);
      const count = await db.prepare("SELECT COUNT(*) AS total FROM goals WHERE user_id = ? AND end_date IS NULL").bind(user.userId).first<{ total: number }>();
      if ((count?.total ?? 0) >= 25) return json({ error: "You can track up to 25 active goals." }, 400);
      const pos = await db.prepare("SELECT COALESCE(MAX(position),4)+1 AS next FROM goals WHERE user_id = ?").bind(user.userId).first<{ next: number }>();
      await db.prepare("INSERT INTO goals (user_id,id,label,detail,icon,builtin,start_date,position) VALUES (?,?,?,?,?,0,?,?)").bind(user.userId,crypto.randomUUID(),body.label,body.detail,"target",body.startDate,pos?.next ?? 5).run();
    } else {
      const goal = await db.prepare("SELECT id,label,detail,icon,builtin,start_date AS startDate,end_date AS endDate,position FROM goals WHERE user_id = ? AND id = ?").bind(user.userId,body.goalId).first<Goal>();
      if (!goal) return json({ error: "This goal could not be found." }, 404);
      if (body.action === "check") {
        if (!isChallengeDate(body.date) || body.date > today || !activeGoals([goal],body.date).length) return json({ error: "This goal cannot be tracked on that day." }, 400);
        await db.prepare("INSERT INTO checkins (user_id,date,goal_id,checked) VALUES (?,?,?,?) ON CONFLICT(user_id,date,goal_id) DO UPDATE SET checked=excluded.checked").bind(user.userId,body.date,body.goalId,Number(body.checked)).run();
      } else if (body.action === "edit") {
        if (goal.builtin || goal.endDate) return json({ error: "Only active personal goals can be edited." }, 400);
        await db.prepare("UPDATE goals SET label=?,detail=? WHERE user_id=? AND id=?").bind(body.label,body.detail,user.userId,body.goalId).run();
      } else {
        if (goal.builtin || goal.endDate || today < START || today > END) return json({ error: "This goal cannot be retired now." }, 400);
        await db.prepare("UPDATE goals SET end_date=? WHERE user_id=? AND id=?").bind(shiftDate(today,-1),user.userId,body.goalId).run();
      }
    }
    return json(await loadTracker(user.userId));
  } catch (e) { console.error("Tracker save failed",e); return json({ error: "Could not save. Your previous progress is safe; please try again." },503); }
}
