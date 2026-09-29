"use client";

import { useEffect, useReducer, useRef } from "react";
import type { Task } from "@/types/task";
import type { Note } from "@/types/note";
import { useAction } from "@/lib/client/use-action";
import { createTimer, focusTimer, FOCUS_DURATIONS } from "@/lib/focus-timer";

export function FocusMode({ task, notes, notesLoading, notesError, onRetryNotes, onComplete, onExit }: {
  task: Task; notes: Note[]; notesLoading: boolean; notesError: string | null;
  onRetryNotes: () => void; onComplete: () => Promise<void>; onExit: () => void;
}) {
  const [timer, dispatch] = useReducer(focusTimer, undefined, () => createTimer());
  const heading = useRef<HTMLHeadingElement>(null);
  const { run, pending, error } = useAction();
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    if (timer.deadline === null) return;
    const tick = () => dispatch({ type: "tick", now: Date.now() });
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [timer.deadline]);

  const time = `${Math.floor(timer.remaining / 60).toString().padStart(2, "0")}:${(timer.remaining % 60).toString().padStart(2, "0")}`;
  return <section className="panel focus-card" aria-labelledby="focus-heading">
    <div className="section-heading"><span className="focus-eyebrow">✦ Your little focus cocoon</span>
      <button className="button" onClick={onExit}>Exit Focus Mode</button></div>
    <h2 ref={heading} tabIndex={-1} id="focus-heading">{task.title}</h2>
    {task.description && <p className="task-description">{task.description}</p>}
    <div className="task-meta"><span className={`priority-badge priority-${task.priority}`}>{task.priority === "high" && <span aria-hidden="true">⚑ </span>}{task.priority} priority</span>
      {task.due_date && <span>Due <time dateTime={task.due_date}>{task.due_date.slice(0, 10)}</time></span>}</div>
    {notesLoading && <p role="status">Loading task notes…</p>}
    {notesError && <div role="alert" className="error">{notesError} <button className="button" onClick={onRetryNotes}>Retry task notes</button></div>}
    {notes.length > 0 && <ul className="task-note-bullets">{notes.map(note => <li key={note.id}>{note.content}</li>)}</ul>}
    <div className="focus-timer">
      <label htmlFor="focus-duration">Focus duration</label>
      <select id="focus-duration" value={timer.minutes} onChange={event => dispatch({ type: "duration", minutes: Number(event.target.value) })}>
        {FOCUS_DURATIONS.map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
      </select>
      <div className="focus-dial" style={{ background: `conic-gradient(var(--accent) ${(1 - timer.remaining / (timer.minutes * 60)) * 360}deg, #dfb9c8 0deg)` }}>
        <div className="focus-dial-face"><span className="focus-dial-star" aria-hidden="true">✧</span><p className="focus-clock" role="timer" aria-label={`${time} remaining`}>{time}</p><span className="focus-dial-caption">a moment for your mind</span></div>
      </div>
      <div className="actions">
        <button className="button primary" disabled={timer.deadline !== null || timer.remaining === 0} onClick={() => dispatch({ type: "start", now: Date.now() })}>Start</button>
        <button className="button" disabled={timer.deadline === null} onClick={() => dispatch({ type: "pause", now: Date.now() })}>Pause</button>
        <button className="button" onClick={() => dispatch({ type: "reset" })}>Reset</button>
      </div>
      <p role="status" className="focus-status">{timer.remaining === 0 ? "Your focus session is complete. Take a breath—you decide what comes next." : timer.deadline !== null ? "A little space to focus." : "Ready when you are."}</p>
    </div>
    {task.completed ? <p role="status" className="focus-completed">✓ Task completed</p> :
      <button className="button primary" disabled={pending} onClick={() => void run(onComplete)}>{pending ? "Saving…" : "Mark task complete"}</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
