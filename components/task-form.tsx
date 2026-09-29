"use client";

import { useId, useState, type FormEvent } from "react";
import type { CreateTaskInput, Task } from "@/types/task";
import { useAction } from "@/lib/client/use-action";

export function TaskForm({ task, onSave, onCancel, disabled = false }: {
  task?: Task;
  onSave: (input: CreateTaskInput) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? "");
  const { run, pending, error } = useAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await run(async () => {
      if (!title.trim()) throw new Error("Please enter a task title.");
      await onSave({ title: title.trim(), description: description.trim() || null, priority, due_date: dueDate || null });
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
          <textarea id={`${id}-description`} value={description} onChange={e => setDescription(e.target.value)} maxLength={10000} rows={2} />
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
            <label htmlFor={`${id}-due`}>Due date</label>
            <input id={`${id}-due`} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} max="9999-12-31" />
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
