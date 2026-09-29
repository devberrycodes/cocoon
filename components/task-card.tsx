"use client";

import { useRef, useState } from "react";
import type { Task, UpdateTaskInput } from "@/types/task";
import { TaskForm } from "./task-form";
import { useAction } from "@/lib/client/use-action";

export function TaskCard({ task, selected, onUpdate, onDelete, onNotes }: {
  task: Task; selected: boolean;
  onUpdate: (id: string, input: UpdateTaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNotes: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const { run, pending, error } = useAction();
  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };

  return (
    <li className={`task-card${selected ? " selected" : ""}`} aria-busy={pending}>
      {editing ? <TaskForm task={task} onCancel={closeEditor} onSave={async input => {
        await onUpdate(task.id, input);
        closeEditor();
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
          <button className="button" disabled={pending} ref={editButton} onClick={() => setEditing(true)} aria-label={`Edit ${task.title}`}>Edit</button>
          <button className="button" disabled={pending} onClick={onNotes} aria-pressed={selected} aria-label={`View notes for ${task.title}`}>Notes</button>
          <button className="button danger" disabled={pending} onClick={() => {
            if (window.confirm(`Delete “${task.title}”? Its notes will be kept in General notes.`)) void run(() => onDelete(task.id));
          }} aria-label={`Delete ${task.title}`}>{pending ? "Working…" : "Delete"}</button>
        </div>
      </>}
      {error && <p role="alert" className="error">{error}</p>}
    </li>
  );
}
