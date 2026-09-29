"use client";

import { useRef, useState } from "react";
import { formatDue } from "@/lib/dates";
import type { Task, UpdateTaskInput } from "@/types/task";
import { Pencil, Trash2 } from "lucide-react";
import { TaskForm } from "./task-form";
import { useAction } from "@/lib/client/use-action";

export function TaskCard({ task, onUpdate, onDelete, onFocus }: {
  task: Task; onUpdate: (id: string, input: UpdateTaskInput) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
  onFocus: (task: Task, trigger: HTMLButtonElement) => void;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
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
        {task.completed && <span>Completed</span>}
        <span className={`priority-badge priority-${task.priority}`}>{task.priority === "high" && <span aria-hidden="true">⚑ </span>}{task.priority} priority</span>
        {task.due_date && <span>Due <time dateTime={task.due_date}>{formatDue(task.due_date)}</time></span>}
      </div>
      <div className="actions task-card-actions">
        <button className="button primary" aria-label={`Edit ${task.title}`} title="Edit task" disabled={pending} ref={editButton} onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" /></button>
        <button className="button danger" aria-label={`Delete ${task.title}`} title="Delete task" disabled={pending} onClick={() => {
          if (window.confirm(`Delete “${task.title}” and its task notes? Clipboard notes will remain. This cannot be undone.`)) {
            void run(() => onDelete(task));
          }
        }}><Trash2 size={18} aria-hidden="true" /></button>
        <button className="button task-focus-action" aria-label={`Focus on ${task.title}`} title="Focus on task" disabled={pending} onClick={event => onFocus(task, event.currentTarget)}><span aria-hidden="true">✦</span></button>
      </div>
    </>}
    {pending && <p role="status" className="muted">Working…</p>}
    {error && <p role="alert" className="error">{error}</p>}

  </li>;
}
