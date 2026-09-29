"use client";

import { useRef, useState } from "react";
import type { Task, TaskNoteAction, UpdateTaskInput } from "@/types/task";
import type { Note } from "@/types/note";
import { TaskForm } from "./task-form";
import { TaskNotes } from "./task-notes";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { useAction } from "@/lib/client/use-action";
import { apiRequest } from "@/lib/client/api";

export function TaskCard({ task, notes, notesLoading, notesError, onRetryNotes, onUpdate, onDelete, onAddNote, onSaveNote, onDeleteNote }: {
  task: Task; notes: Note[]; notesLoading: boolean; notesError: string | null; onRetryNotes: () => void;
  onUpdate: (id: string, input: UpdateTaskInput) => Promise<void>;
  onDelete: (task: Task, action?: TaskNoteAction) => Promise<void>;
  onAddNote: (content: string, clipboard: boolean) => Promise<void>;
  onSaveNote: (id: string, content: string) => Promise<void>; onDeleteNote: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [deleteState, setDeleteState] = useState<{ hasNotes: boolean } | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const notesButton = useRef<HTMLButtonElement>(null);
  const { run, pending, error } = useAction();
  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };

  return <li className="task-card" aria-busy={pending}>
    {editing ? <TaskForm task={task} onCancel={closeEditor} onSave={async input => {
      await onUpdate(task.id, input); closeEditor();
    }} /> : <>
      <div className="task-heading">
        <input type="checkbox" checked={task.completed} disabled={pending}
          aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
          onChange={() => void run(() => onUpdate(task.id, { completed: !task.completed }))} />
        <h3 className={task.completed ? "completed" : ""}>{task.title}</h3>
      </div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta">
        <span>{task.completed ? "Completed" : "Open"}</span>
        <span className="capitalize">{task.priority} priority</span>
        {task.due_date && <span>Due <time dateTime={task.due_date}>{task.due_date.slice(0, 10)}</time></span>}
      </div>
      <div className="actions">
        <button className="button" disabled={pending} ref={editButton} onClick={() => { setEditingNotes(false); setEditing(true); }}>Edit task</button>
        <button className="button" disabled={pending} ref={notesButton} aria-expanded={editingNotes}
          onClick={() => setEditingNotes(value => !value)}>Edit notes</button>
        <button className="button danger" disabled={pending} onClick={() => void run(async () => {
          // Recheck at deletion time; never decide from a potentially stale list.
          const current = await apiRequest<Note[]>(`/api/notes?task_id=${task.id}`);
          setDeleteState({ hasNotes: current.length > 0 });
        })}>Delete</button>
      </div>
    </>}
    <TaskNotes notes={notes} editing={editingNotes && !editing} loading={notesLoading} error={notesError} onRetry={onRetryNotes}
      onAdd={onAddNote} onSave={onSaveNote} onDelete={onDeleteNote} onDone={() => {
        setEditingNotes(false); requestAnimationFrame(() => notesButton.current?.focus());
      }} />
    {pending && <p role="status" className="muted">Working…</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {deleteState && <DeleteTaskDialog task={task} hasNotes={deleteState.hasNotes} onCancel={() => setDeleteState(null)}
      onConfirm={async action => { await onDelete(task, action); setDeleteState(null); }} />}
  </li>;
}
