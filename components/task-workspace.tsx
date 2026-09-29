"use client";

import { useEffect, useState } from "react";
import type { Task, TaskNoteAction, UpdateTaskInput } from "@/types/task";
import type { Note } from "@/types/note";
import { apiRequest } from "@/lib/client/api";
import { useNotes } from "@/lib/client/use-notes";
import { TaskForm } from "./task-form";
import { TaskCard } from "./task-card";
import { NotesPanel } from "./notes-panel";

export function TaskWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const noteState = useNotes();

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
    setTasks(current => current.map(task => task.id === id ? updated : task)); setMessage("Task saved.");
  }
  async function addNote(content: string, taskId: string | null = null, clipboard = false) {
    const note = await apiRequest<Note>("/api/notes", { method: "POST", body: JSON.stringify({ content, task_id: taskId, add_to_clipboard: clipboard }) });
    noteState.setNotes(current => [note, ...current]);
    setMessage(note.task_id === null ? "Note added to the clipboard." : "Task note added.");
  }
  async function saveNote(id: string, content: string) {
    const updated = await apiRequest<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
    noteState.setNotes(current => current.map(note => note.id === id ? updated : note)); setMessage("Note saved.");
  }
  async function deleteNote(id: string) {
    await apiRequest<void>(`/api/notes/${id}`, { method: "DELETE" });
    noteState.setNotes(current => current.filter(note => note.id !== id)); setMessage("Note deleted.");
  }
  async function deleteTask(task: Task, action?: TaskNoteAction) {
    await apiRequest<void>(`/api/tasks/${task.id}${action ? `?notes=${action}` : ""}`, { method: "DELETE" });
    setTasks(current => current.filter(item => item.id !== task.id));
    // Update immediately, then reconcile with the committed database state.
    noteState.setNotes(current => action === "keep"
      ? current.map(note => note.task_id === task.id ? { ...note, task_id: null, source_task_title: task.title } : note)
      : current.filter(note => note.task_id !== task.id));
    noteState.refresh();
    setMessage(action === "keep" ? "Task deleted. Its notes are on the clipboard." : "Task deleted.");
    requestAnimationFrame(() => document.getElementById(action === "keep" ? "notes-heading" : "tasks-heading")?.focus());
  }

  return <div className="workspace">
    <p className="sr-only" role="status">{message}</p>
    <div className="task-column">
      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Add a task</h2>
        <TaskForm disabled={loading || Boolean(error)} onSave={async input => {
          const task = await apiRequest<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
          setTasks(current => [task, ...current]);
          if (input.notes?.length) noteState.refresh();
          setMessage("Task added.");
        }} />
      </section>
      <section className="panel" aria-labelledby="tasks-heading">
        <div className="section-heading">
          <h2 id="tasks-heading" tabIndex={-1}>Your tasks</h2>
          {!loading && !error && <span className="muted">{tasks.filter(task => !task.completed).length} open · {tasks.filter(task => task.completed).length} completed</span>}
        </div>
        {loading && <p role="status" className="muted">Loading tasks…</p>}
        {error && <div className="error" role="alert"><p>{error}</p><button className="button" disabled={loading} onClick={() => {
          setLoading(true); setAttempt(value => value + 1);
        }}>Retry loading tasks</button></div>}
        {!loading && !error && tasks.length === 0 && <p className="empty">No tasks yet. Add something you want to work on.</p>}
        <ul className="task-list" aria-label="Tasks">
          {tasks.map(task => <TaskCard key={task.id} task={task} notes={noteState.notes.filter(note => note.task_id === task.id)}
            notesLoading={noteState.loading} notesError={noteState.error} onRetryNotes={noteState.refresh}
            onUpdate={updateTask} onDelete={deleteTask} onAddNote={(content, clipboard) => addNote(content, task.id, clipboard)}
            onSaveNote={saveNote} onDeleteNote={deleteNote} />)}
        </ul>
      </section>
    </div>
    <NotesPanel notes={noteState.notes.filter(note => note.task_id === null)} loading={noteState.loading} error={noteState.error}
      onRetry={noteState.refresh} onAdd={content => addNote(content)} onSave={saveNote} onDelete={deleteNote} />
  </div>;
}
