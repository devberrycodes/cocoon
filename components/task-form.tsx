"use client";

import { useId, useState, type FormEvent } from "react";
import type { CreateTaskRequest, Task } from "@/types/task";
import { localDateTime } from "@/lib/dates";
import { useAction } from "@/lib/client/use-action";

export function TaskForm({ task, onSave, onCancel, disabled = false }: {
  task?: Task;
  onSave: (input: CreateTaskRequest) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ? localDateTime(task.due_date) : "");
  const { run, pending, error } = useAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await run(async () => {
      if (!title.trim()) throw new Error("Please enter a task title.");
      if (dueDate && new Date(dueDate).getTime() < Math.floor(Date.now() / 60000) * 60000 && (!task || dueDate !== (task.due_date ? localDateTime(task.due_date) : ""))) {
        throw new Error("Due date & time cannot be in the past.");
      }
      await onSave({ title: title.trim(), description: description.trim() || null, priority,
        ...(!task || dueDate !== (task.due_date ? localDateTime(task.due_date) : "") ? { due_date: dueDate ? new Date(dueDate).toISOString() : null } : {}),
      });
    });
    if (success && !task) {
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate("");
    }
  }

  return (
    <form onSubmit={submit} aria-label={task ? "Edit task" : "Create task"} aria-busy={pending}>
      <fieldset disabled={pending || disabled} className="form-stack">
        <div className="field">
          <label htmlFor={`${id}-title`}>Task title <span className="muted">(required)</span></label>
          <input id={`${id}-title`} value={title} onChange={e => setTitle(e.target.value)} required maxLength={200}
            autoFocus={Boolean(task)} aria-describedby={error ? `${id}-error` : undefined} placeholder="What would you like to do?" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-description`}>Description</label>
          <textarea id={`${id}-description`} value={description} onChange={e => setDescription(e.target.value)} maxLength={10000} rows={task ? 2 : 1} />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor={`${id}-priority`}>Priority</label>
            <select id={`${id}-priority`} value={priority} onChange={e => {
              const value = e.target.value;
              if (value === "low" || value === "medium" || value === "high") setPriority(value);
            }}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-due`}>Due date & time</label>
            <input id={`${id}-due`} type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} min={task?.due_date && dueDate === localDateTime(task.due_date) ? undefined : localDateTime()} max="9999-12-31T23:59" />
          </div>
        </div>
        <div className="actions">
          <button className="button primary" type="submit">{pending ? "Saving…" : task ? "Save changes" : "Add task"}</button>
          {onCancel && <button className="button" type="button" onClick={onCancel}>Cancel</button>}
        </div>
      </fieldset>
      {error && <p className="error" role="alert" id={`${id}-error`}>{error}</p>}
    </form>
  );
}
