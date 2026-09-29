"use client";

import { useEffect, useRef, useState } from "react";
import type { Task, UpdateTaskInput } from "@/types/task";
import type { Note, NoteColor } from "@/types/note";
import { apiRequest } from "@/lib/client/api";
import { useNotes } from "@/lib/client/use-notes";
import { CompletionConfetti } from "./completion-confetti";
import { Walkthrough } from "./walkthrough";
import { FocusMode } from "./focus-mode";
import { TaskForm } from "./task-form";
import { TaskCard } from "./task-card";
import { CollapsiblePanel } from "./collapsible-panel";
import { AudioPlayer } from "./audio-player";
import { WorkspaceDecorations } from "./workspace-decorations";
import { NotesPanel } from "./notes-panel";

export function TaskWorkspace() {
  const [creating, setCreating] = useState(false);
  const addTrigger = useRef<HTMLButtonElement>(null);
  function closeCreate() {
    setCreating(false);
    requestAnimationFrame(() => addTrigger.current?.focus());
  }
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [celebration, setCelebration] = useState(0);
  const [message, setMessage] = useState("");
  const noteState = useNotes();
  const picker = useRef<HTMLDialogElement>(null);
  const navFocus = useRef<HTMLButtonElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusTrigger = useRef<HTMLButtonElement | null>(null);
  const focusedTask = tasks.find(task => task.id === focusId);
  function exitFocus() {
    setFocusId(null);
    requestAnimationFrame(() => focusTrigger.current?.focus());
  }

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Task[]>("/api/tasks", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setTasks(data); setError(null); } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function updateTask(id: string, input: UpdateTaskInput) {
    const updated = await apiRequest<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    if (updated.completed && tasks.some(task => task.id === id && !task.completed)) setCelebration(value => value + 1);
    setTasks(current => current.map(task => task.id === id ? updated : task)); setMessage(updated.completed ? "Task completed. Nicely done!" : "Task saved.");
  }
  async function addNote(content: string, taskId: string | null = null, clipboard = false) {
    const note = await apiRequest<Note>("/api/notes", { method: "POST", body: JSON.stringify({ content, task_id: taskId, add_to_clipboard: clipboard }) });
    noteState.setNotes(current => [note, ...current]);
    if (clipboard) noteState.refresh();
    setMessage(note.task_id === null ? "Note added to the clipboard." : "Task note added.");
  }
  async function saveNote(id: string, content: string, clipboard = false) {
    const updated = await apiRequest<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ content, add_to_clipboard: clipboard }) });
    noteState.setNotes(current => current.map(note => note.id === id ? updated : note)); setMessage("Note saved.");
    if (clipboard) noteState.refresh();
  }
  async function changeNoteColor(id: string, color: NoteColor) {
    const updated = await apiRequest<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ color }) });
    noteState.setNotes(current => current.map(note => note.id === id ? updated : note));
    setMessage("Note color saved.");
  }
  async function deleteNote(id: string) {
    await apiRequest<void>(`/api/notes/${id}`, { method: "DELETE" });
    noteState.setNotes(current => current.filter(note => note.id !== id)); setMessage("Note deleted.");
  }
  async function deleteTask(task: Task) {
    await apiRequest<void>(`/api/tasks/${task.id}`, { method: "DELETE" });
    setTasks(current => current.filter(item => item.id !== task.id));
    noteState.setNotes(current => current.filter(note => note.task_id !== task.id));
    setMessage("Task and its task notes deleted. Clipboard notes are unchanged.");
    requestAnimationFrame(() => document.getElementById("tasks-heading")?.focus());
  }

  return <>
    {celebration > 0 && <CompletionConfetti key={celebration} />}
    <header className="site-header"><div className="page-width">
      <div><p className="brand">Cocoon</p><p className="brand-tagline">Make room for what matters.</p></div>
      <div className="actions"><button data-tour="focus" className="button primary mobile-focus-nav" onClick={event => { focusTrigger.current = event.currentTarget; picker.current?.showModal(); }}>✦ Focus</button><Walkthrough /></div>
    </div></header>
    <dialog ref={picker} className="focus-picker" aria-labelledby="picker-heading">
      <div className="section-heading"><h2 id="picker-heading">What would you like to focus on?</h2><button className="button" onClick={() => picker.current?.close()}>Close</button></div>
      {loading ? <p>Loading tasks…</p> : error ? <p role="alert">{error}</p> : tasks.length === 0 ? <p>Add a task to your workspace first, then come back here.</p> :
        <ul>{tasks.map(task => <li key={task.id}><button className="button" onClick={() => {
          picker.current?.close(); setFocusId(task.id);
        }}>{task.title}{task.completed ? " · Completed" : ""}</button></li>)}</ul>}
    </dialog>
    <main id="main" className="page-width main-content">
    <div className="page-intro"><h1>Your workspace</h1><p>Organise your tasks and keep your notes close.</p></div>
    <div className={`workspace${focusedTask ? " is-focusing" : ""}`}>
    {focusedTask && <FocusMode key={focusedTask.id} task={focusedTask}
      onComplete={() => updateTask(focusedTask.id, { completed: true })} onExit={exitFocus} />}
    <WorkspaceDecorations />
    {!focusedTask && <button data-tour="focus" ref={navFocus} className="focus-launcher" onClick={() => { focusTrigger.current = navFocus.current; picker.current?.showModal(); }}><span aria-hidden="true">✦</span>Start Focus Mode</button>}
    <p className="sr-only" role="status">{message}</p>

      <CollapsiblePanel kind="tasks" label="Tasks">
      <section className="panel tasks-panel" aria-labelledby="tasks-heading">
        <div className="section-heading">
          <h2 id="tasks-heading" tabIndex={-1}>Your tasks</h2>
          {!loading && !error && <span className="muted">{tasks.filter(task => task.completed).length} completed</span>}
        </div>
        <button ref={addTrigger} data-tour="add-task" type="button" className="button primary add-task-toggle"
          aria-expanded={creating} aria-controls="task-create-form" disabled={loading || Boolean(error)}
          onClick={() => {
            if (creating) closeCreate();
            else { setCreating(true); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#task-create-form input')?.focus()); }
          }}>{creating ? "− Close form" : "＋ Add task"}</button>
      <div id="task-create-form" hidden={!creating}>
      {creating && <section className="panel create-panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Add a task</h2>
        <TaskForm onCancel={closeCreate} disabled={loading || Boolean(error)} onSave={async input => {
          const task = await apiRequest<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
          setTasks(current => [task, ...current]);
          setMessage("Task added.");
          closeCreate();
        }} />
      </section>}
      </div>
        {loading && <p role="status" className="muted">Loading tasks…</p>}
        {error && <div className="error" role="alert"><p>{error}</p><button className="button" disabled={loading} onClick={() => {
          setLoading(true); setAttempt(value => value + 1);
        }}>Retry loading tasks</button></div>}
        {!loading && !error && tasks.length === 0 && <p className="empty">No tasks yet. Use + Add task above to get started.</p>}
        <ul className="task-list" aria-label="Tasks">
          {[...tasks].sort((a, b) => Number(a.completed) - Number(b.completed)).map(task => <TaskCard key={task.id} task={task}
            onFocus={(task, trigger) => { focusTrigger.current = trigger; setFocusId(task.id); }}
            onUpdate={updateTask} onDelete={deleteTask} />)}
        </ul>
      </section>
      </CollapsiblePanel>
    <div className="clipboard-column">
      <CollapsiblePanel kind="music" label="Music"><AudioPlayer /></CollapsiblePanel>
      <CollapsiblePanel kind="notes" label="Notes">
    <NotesPanel notes={noteState.notes.filter(note => note.task_id === null)} loading={noteState.loading} error={noteState.error}
      onColorChange={changeNoteColor} onRetry={noteState.refresh} onAdd={content => addNote(content)} onSave={saveNote} onDelete={deleteNote} />
      </CollapsiblePanel>
    </div>
  </div>
  </main></>;
}
