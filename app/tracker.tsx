"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Apple, Check, ChevronLeft, ChevronRight, Flame, LockKeyhole, Moon, Plus, Snowflake, Sparkles, Sun, Sunrise, Target, Trophy, Utensils, Pencil, Archive, LoaderCircle, CloudCheck } from "lucide-react";
import { flushSync } from "react-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { START, END, DATES, DEFAULT_GOALS, activeGoals, dayProgress, overallProgress, shiftDate, todayIST, isChallengeDate, type Goal, type TrackerData } from "@/lib/tracker";
import { readTrackerResponse, TrackerRequestError } from "@/lib/tracker-api";

const icons = { moon: Moon, sunrise: Sunrise, sun: Sun, apple: Apple, utensils: Utensils, target: Target };
const dateLabel = (date: string, short = false) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: short ? "short" : "long", ...(short ? {} : { weekday: "long" as const }), timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
type ModelContext = { registerTool(tool: { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options?: {signal: AbortSignal}): void | Promise<void> };

export default function Tracker() {
  const initialToday = todayIST();
  const [data, setData] = useState<TrackerData>({ goals: DEFAULT_GOALS, checkins: [], today: initialToday });
  const [selected, setSelected] = useState(initialToday < START ? START : initialToday > END ? END : initialToday);
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [signIn, setSignIn] = useState(false);
  const [dialog, setDialog] = useState(false), [editing, setEditing] = useState<Goal | null>(null);
  const [label, setLabel] = useState(""), [detail, setDetail] = useState(""), [startDate, setStartDate] = useState(selected);
  const [retiring, setRetiring] = useState<Goal | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/tracker", { cache: "no-store", credentials: "same-origin" });
      const result = await readTrackerResponse(response, "load");
      setData(result); setReady(true); setSignIn(false);
    } catch (e) {
      const needsSignIn = e instanceof TrackerRequestError && e.signIn;
      setSignIn(needsSignIn);
      if (needsSignIn) setReady(false);
      setError(e instanceof Error ? e.message : "Could not load. Please retry.");
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onFocus = () => { if (!busy.current) void load(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => { if (!busy.current && todayIST() !== data.today) void load(); }, 60000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [load, data.today]);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    if (!ready || busy.current) throw new Error("Wait for your tracker to finish loading or saving.");
    busy.current = true; setSaving(true); setError("");
    try {
      const response = await fetch("/api/tracker", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await readTrackerResponse(response, "save");
      setSignIn(false);
      flushSync(() => setData(result)); return result as TrackerData;
    } catch (e) {
      const needsSignIn = e instanceof TrackerRequestError && e.signIn;
      setSignIn(needsSignIn);
      if (needsSignIn) setReady(false);
      const message = e instanceof Error ? e.message : "Could not save. Please retry.";
      setError(message); toast.error(message); throw e;
    }
    finally { busy.current = false; setSaving(false); }
  }, [ready]);

  const toolState = useRef({ data, selected, ready, mutate });
  toolState.current = { data, selected, ready, mutate };
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<ModelContext["registerTool"]>[0]) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error); } catch (e) { console.error(e); }
    };
    register({ name: "read_winter_arc_progress", title: "Read Winter Arc progress", description: "Read the selected day's goals and overall challenge progress.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => {
      const s = toolState.current; if (!s.ready) throw new Error("Tracker is not loaded.");
      return { date: s.selected, daily: dayProgress(s.data,s.selected), overall: overallProgress(s.data), goals: activeGoals(s.data.goals,s.selected).map(g => ({ id: g.id, label: g.label, checked: s.data.checkins.some(c => c.date === s.selected && c.goalId === g.id && c.checked === 1) })) };
    }});
    register({ name: "select_winter_arc_day", title: "Select a challenge day", description: "Open a date within September 28–December 30, 2026. This does not change any check-offs.", inputSchema: { type: "object", properties: { date: { type: "string", format: "date" } }, required: ["date"], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: (input) => {
      const date = (input as {date?: unknown})?.date; if (typeof date !== "string" || !isChallengeDate(date)) throw new Error("Date must be within the challenge.");
      flushSync(() => setSelected(date)); return { date, daily: dayProgress(toolState.current.data,date) };
    }});
    register({ name: "set_winter_arc_check", title: "Set a daily check-off", description: "Check or uncheck one active goal on an elapsed challenge date and save the result.", inputSchema: { type: "object", properties: { date: { type: "string", format: "date" }, goalId: { type: "string" }, checked: { type: "boolean" } }, required: ["date","goalId","checked"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input) => {
      const i = input as {date?: unknown; goalId?: unknown; checked?: unknown}, s = toolState.current;
      if (!i || typeof i.date !== "string" || !isChallengeDate(i.date) || i.date > s.data.today || typeof i.goalId !== "string" || typeof i.checked !== "boolean" || !activeGoals(s.data.goals,i.date).some(g => g.id === i.goalId)) throw new Error("Choose an active goal and an elapsed challenge date.");
      const result = await s.mutate({action:"check",date:i.date,goalId:i.goalId,checked:i.checked}); flushSync(() => setSelected(i.date as string));
      return { saved: true, date: i.date, daily: dayProgress(result,i.date) };
    }});
    return () => lifecycle.abort();
  }, []);

  const day = dayProgress(data, selected), overall = overallProgress(data), goals = activeGoals(data.goals, selected);
  const current = data.today < START ? START : data.today > END ? END : data.today;
  const dayNumber = DATES.indexOf(selected) + 1, elapsed = DATES.filter(d => d <= data.today).length;
  const future = selected > data.today;
  const canEdit = ready && !saving && !loading && !future;
  function openAdd() { setEditing(null); setLabel(""); setDetail(""); setStartDate(current); setDialog(true); }
  function openEdit(goal: Goal) { setEditing(goal); setLabel(goal.label); setDetail(goal.detail); setDialog(true); }
  async function saveGoal(e: FormEvent) {
    e.preventDefault();
    try {
      await mutate(editing ? { action:"edit",goalId:editing.id,label,detail } : { action:"add",label,detail,startDate });
      setDialog(false); toast.success(editing ? "Goal updated." : "Your new goal is ready.");
    } catch { /* Preserve the form for retry. */ }
  }
  const message = day.perfect ? "Day complete. Keep this promise tomorrow." : day.done > 0 ? "You’re showing up. Keep the momentum." : "Start with one check. Build from there.";

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Winter Arc home"><span className="brand-mark">W</span><span>WINTER ARC<span className="brand-year"> / 2026</span></span></a>
      <span className="privacy"><LockKeyhole size={14} /> Private space</span>
    </header>
    <main className="workspace">
      <div className="page-heading"><div><p className="eyebrow"><Snowflake size={14}/> THE 94-DAY COMMITMENT</p><h1>Build the person<br className="mobile-break"/> you want to be<span>.</span></h1><p className="challenge-dates">28 September – 30 December 2026</p></div><div className="season-counter"><strong>{Math.max(0,94-elapsed)}</strong><span>days still ahead</span></div></div>
      {error && <div className="error-banner" role="alert"><span>{error}</span>{signIn ? <a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="button primary">Sign in with ChatGPT</a> : <button className="button secondary" onClick={() => void load()} disabled={loading}>Retry loading</button>}</div>}
      <div className="main-grid">
        <section className="daily-panel panel" aria-labelledby="daily-heading">
          <div className="day-toolbar"><span className="eyebrow">DAY {String(dayNumber).padStart(2,"0")} / 94 {selected===data.today && <span className="today-tag">TODAY</span>}</span><div className="date-nav"><button aria-label="Previous day" disabled={selected===START} onClick={() => setSelected(shiftDate(selected,-1))}><ChevronLeft size={18}/></button><button className="today-button" onClick={() => setSelected(current)}>Today</button><button aria-label="Next day" disabled={selected===END} onClick={() => setSelected(shiftDate(selected,1))}><ChevronRight size={18}/></button></div></div>
          <div className="daily-title"><div><h2 id="daily-heading">{dateLabel(selected)}</h2><p>{future ? "Your next commitment is waiting." : message}</p></div><div className="day-ring" role="progressbar" aria-label={`Daily completion: ${day.done} of ${day.total} commitments`} aria-valuenow={day.percent} aria-valuemin={0} aria-valuemax={100} style={{"--percent": `${day.percent}%`} as React.CSSProperties}><span>{day.percent}<small>%</small></span></div></div>
          <div className="checklist-heading"><span>DAILY FOUNDATIONS</span><span>{goals.filter(g=>g.builtin && data.checkins.some(c=>c.date===selected && c.goalId===g.id && c.checked===1)).length} / 5 done</span></div>
          <div className="habit-list" aria-busy={saving || loading}>
            {goals.filter(g=>g.builtin).map(g => {
              const Icon = icons[g.icon as keyof typeof icons] || Target;
              const checked = data.checkins.some(c => c.date === selected && c.goalId === g.id && c.checked === 1);
              return <div key={g.id} className={`habit-row ${checked ? "checked" : ""}`}><div className="habit-icon"><Icon size={21}/></div><label htmlFor={`goal-${g.id}`}><strong>{g.label}</strong><span>{g.detail}</span></label><Checkbox id={`goal-${g.id}`} aria-label={g.label} className="habit-checkbox" checked={checked} disabled={!canEdit} onCheckedChange={value => { void mutate({action:"check", date:selected, goalId:g.id,checked:value===true}).catch(()=>{}); }}/></div>;
            })}
          </div>
          <div className="custom-heading"><h3>Your personal goals</h3><button className="text-button" disabled={!ready || saving || data.today>END} onClick={openAdd}><Plus size={16}/> Add goal</button></div>
          {goals.filter(g=>!g.builtin).length === 0 ? <button className="empty-goals" onClick={openAdd} disabled={!ready || saving || data.today>END}><span className="empty-goal-icon"><Target size={20}/></span><span><strong>Make this arc yours</strong><small>Add a workout, study session, or any daily goal.</small></span><Plus size={18}/></button> : <div className="habit-list custom-list">{goals.filter(g=>!g.builtin).map(g => {
            const checked = data.checkins.some(c => c.date === selected && c.goalId === g.id && c.checked === 1);
            return <div key={g.id} className={`habit-row ${checked?"checked":""}`}><div className="habit-icon personal"><Target size={21}/></div><label htmlFor={`goal-${g.id}`}><strong>{g.label}</strong><span>{g.detail || "One small promise to yourself."}</span></label>{!g.endDate && <button className="icon-button edit-goal" aria-label={`Edit ${g.label}`} onClick={()=>openEdit(g)} disabled={!ready || saving || loading}><Pencil size={15}/></button>}<Checkbox id={`goal-${g.id}`} className="habit-checkbox" aria-label={g.label} checked={checked} disabled={!canEdit} onCheckedChange={value => { void mutate({action:"check",date:selected,goalId:g.id,checked:value===true}).catch(()=>{}); }}/></div>;
          })}</div>}
          <div className="save-line" role="status">{loading ? <><LoaderCircle className="spin" size={14}/> Loading your progress…</> : saving ? <><LoaderCircle className="spin" size={14}/> Saving…</> : ready && !error ? <><CloudCheck size={15}/> All changes saved</> : signIn ? <><LockKeyhole size={14}/> <a className="text-button" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in to track your days</a></> : <>Progress unavailable — please retry.</>}{future && <span>Future check-offs unlock on the day.</span>}</div>
        </section>
        <aside className="progress-column">
          <section className="overall-panel panel"><div className="section-label"><span className="eyebrow">THE BIG PICTURE</span><Sparkles size={17}/></div><h2>Your arc,<br/>one action at a time.</h2><div className="overall-number">{overall.percent}<span>%</span></div><p className="muted">of your challenge goals completed</p><Progress value={overall.percent} aria-label="Overall challenge completion" className="overall-bar"/><div className="progress-detail"><span>{overall.done} actions done</span><span>{overall.total} planned</span></div><div className="mini-stats"><div><Flame size={18}/><strong>{overall.streak}<small> days</small></strong><span>Perfect-day streak</span></div><div><Trophy size={18}/><strong>{overall.perfectDays}<small> / 94</small></strong><span>Complete days</span></div></div></section>
          <section className="consistency-panel panel"><div className="consistency-title"><h3>Consistency so far</h3><span>{overall.consistency}%</span></div><Progress value={overall.consistency} aria-label="Consistency through today" className="consistency-bar"/><p>{overall.done} of {overall.dueTotal} check-offs through {dateLabel(current,true)}.</p><div className="small-divider"/><div className="time-progress"><span>Challenge timeline</span><strong>{elapsed} / 94 days</strong></div><Progress value={elapsed/94*100} aria-label="Elapsed challenge days" className="timeline-bar"/></section>
          <div className="motivation"><span className="quote-mark">“</span><p>A missed day doesn’t<br/>have to become<br/><strong>a missed week.</strong></p><span className="motivation-footer">COME BACK. CHECK IN. KEEP GOING.</span></div>
        </aside>
      </div>
      <section className="calendar-panel panel" aria-labelledby="calendar-heading"><div className="calendar-heading"><div><p className="eyebrow">YOUR SEASON AT A GLANCE</p><h2 id="calendar-heading">Every day leaves a mark.</h2></div><div className="legend"><span><i className="legend-empty"/>Not logged</span><span><i className="legend-partial"/>In progress</span><span><i className="legend-full"/>Complete</span></div></div><div className="months">{["2026-09","2026-10","2026-11","2026-12"].map(month => {
        const dates = DATES.filter(d=>d.startsWith(month)), offset = (new Date(dates[0]+"T12:00:00Z").getUTCDay()+6)%7;
        return <div className="month" key={month}><h3>{new Intl.DateTimeFormat("en",{month:"long",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"))}<span>{dates.length} days</span></h3><div className="month-grid">{["M","T","W","T","F","S","S"].map((d,i)=><span className="weekday" key={i}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{dates.map(date=>{
          const d = dayProgress(data,date), state = d.perfect ? "full" : d.done>0 ? "partial" : "empty";
          return <button key={date} onClick={()=>{setSelected(date);document.getElementById("daily-heading")?.scrollIntoView({behavior:"smooth",block:"center"});}} aria-label={`${dateLabel(date)}, ${d.done} of ${d.total} complete${date>data.today?", upcoming":""}`} aria-pressed={date===selected} title={`${dateLabel(date)} · ${d.percent}%`} className={`calendar-day ${state} ${date===selected?"selected":""} ${date===data.today?"actual-today":""} ${date>data.today?"future":""}`}>{Number(date.slice(-2))}</button>;
        })}</div></div>;
      })}</div><div className="calendar-footer"><span><Check size={14}/> {overall.loggedDays} days with a check-in</span><span>Tap a date to check in or revisit your progress.</span></div></section>
      <footer className="footer"><span>SMALL ACTIONS. EVERY DAY.</span><span><LockKeyhole size={13}/> Only you can access this tracker.</span></footer>
    </main>
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="goal-dialog"><DialogHeader><span className="dialog-icon"><Target size={22}/></span><DialogTitle>{editing ? "Shape your goal" : "Add a daily commitment"}</DialogTitle><DialogDescription>{editing ? "Rename your goal without losing previous check-offs." : "Keep it specific, realistic, and easy to check off."}</DialogDescription></DialogHeader><form onSubmit={saveGoal}><label className="field-label" htmlFor="goal-name">Goal name</label><input id="goal-name" value={label} onChange={e=>setLabel(e.target.value)} maxLength={60} required placeholder="e.g. 45 minutes of focused study" autoFocus/><label className="field-label" htmlFor="goal-detail">A little detail <span>(optional)</span></label><input id="goal-detail" value={detail} onChange={e=>setDetail(e.target.value)} maxLength={100} placeholder="e.g. DBMS, Java, or DSA — phone away"/>{!editing && <><label className="field-label" htmlFor="goal-start">Start tracking from</label><input id="goal-start" type="date" min={START} max={current} value={startDate} onChange={e=>setStartDate(e.target.value)} required/><p className="form-note">Earlier days won’t count toward this goal.</p></>}<button className="button primary full-width" type="submit" disabled={saving || !label.trim()}>{saving ? "Saving…" : editing ? "Save changes" : "Add goal"}</button>{editing && <button className="retire-button" type="button" onClick={()=>{setDialog(false);setRetiring(editing);}} disabled={saving}><Archive size={15}/> Retire this goal</button>}{error && <p className="form-error" role="alert">{error}</p>}</form></DialogContent></Dialog>
    <AlertDialog open={!!retiring} onOpenChange={open=>{if(!open)setRetiring(null);}}><AlertDialogContent className="goal-dialog"><AlertDialogHeader><AlertDialogTitle>Retire “{retiring?.label}”?</AlertDialogTitle><AlertDialogDescription>This stops tracking the goal from today. Previous days and their check-offs stay in your history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep goal</AlertDialogCancel><AlertDialogAction className="button primary" onClick={()=>{if(retiring)void mutate({action:"archive",goalId:retiring.id}).then(()=>toast.success("Goal retired. Your history is kept.")).catch(()=>{});}}>Retire goal</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Toaster theme="dark" position="bottom-center"/>
  </div>;
}
