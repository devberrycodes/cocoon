"use client";

import { useId, useState, type FormEvent } from "react";
import type { CreateTaskRequest, Task } from "@/types/task";
import { todayDate } from "@/lib/dates";
import type { InitialTaskNote } from "@/types/note";
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
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState<(InitialTaskNote & { draftId: string })[]>([]);
  const { run, pending, error } = useAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await run(async () => {
      if (!title.trim()) throw new Error("Please enter a task title.");
      if (dueDate && dueDate < todayDate() && (!task || dueDate !== task.due_date?.slice(0, 10))) {
        throw new Error("Due date cannot be in the past.");
      }
      if (notes.some(note => !note.content.trim())) throw new Error("Enter content for each note or remove the empty note.");
      await onSave({ title: title.trim(), description: description.trim() || null, priority,
        ...(!task || dueDate !== (task.due_date?.slice(0, 10) ?? "") ? { due_date: dueDate || null } : {}),
        ...(!task && notes.length ? { notes: notes.map(({ content, add_to_clipboard }) => ({ content, add_to_clipboard })) } : {}),
      });
    });
    if (success && !task) {
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setNotes([]);
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
        {!task && <fieldset className="initial-notes">
          <legend>Notes <span className="muted">(optional)</span></legend>
          {notes.map((note, index) => <div className="initial-note" key={note.draftId}>
            <label htmlFor={`${id}-note-${index}`}>Note {index + 1}</label>
            <textarea id={`${id}-note-${index}`} rows={2} required maxLength={10000} value={note.content}
              onChange={event => setNotes(current => current.map((item, i) => i === index ? { ...item, content: event.target.value } : item))} />
            <label className="checkbox-label"><input type="checkbox" checked={note.add_to_clipboard}
              onChange={event => setNotes(current => current.map((item, i) => i === index ? { ...item, add_to_clipboard: event.target.checked } : item))} />Also add to clipboard</label>
            <button className="button" type="button" onClick={() => setNotes(current => current.filter((_, i) => i !== index))}>Remove note {index + 1}</button>
          </div>)}
          <button className="button" type="button" disabled={notes.length >= 50} onClick={() => setNotes(current => [...current, { draftId: crypto.randomUUID(), content: "", add_to_clipboard: false }])}>Add a note</button>
        </fieldset>}
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
            <input id={`${id}-due`} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={todayDate()} max="9999-12-31" />
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
