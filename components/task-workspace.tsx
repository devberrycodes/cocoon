"use client";

import { useEffect, useState } from "react";
import type { Task, UpdateTaskInput } from "@/types/task";
import { apiRequest } from "@/lib/client/api";
import { TaskForm } from "./task-form";
import { TaskCard } from "./task-card";
import { NotesPanel } from "./notes-panel";

export function TaskWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesVersion, setNotesVersion] = useState(0);
  const [message, setMessage] = useState("");
  const selectedTask = tasks.find(task => task.id === selectedId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Task[]>("/api/tasks", { signal: controller.signal })
      .then(data => { setTasks(data); setError(null); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function updateTask(id: string, input: UpdateTaskInput) {
    const updated = await apiRequest<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    setTasks(current => current.map(task => task.id === id ? updated : task));
    setMessage("Task saved.");
  }
  function selectNotes(id: string | null) {
    setSelectedId(id);
    requestAnimationFrame(() => document.getElementById("notes-heading")?.focus());
  }

  return <div className="workspace">
    <div className="task-column">
      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Add a task</h2>
        <TaskForm disabled={loading || Boolean(error)} onSave={async input => {
          const task = await apiRequest<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
          setTasks(current => [task, ...current]); setMessage("Task added.");
        }} />
      </section>
      <section className="panel" aria-labelledby="tasks-heading">
        <div className="section-heading">
          <h2 id="tasks-heading" tabIndex={-1}>Your tasks</h2>
          {!loading && !error && <span className="muted">{tasks.filter(task => !task.completed).length} open · {tasks.filter(task => task.completed).length} completed</span>}
        </div>
        <p className="sr-only" role="status">{message}</p>
        {loading && <p role="status" className="muted">Loading tasks…</p>}
        {error && <div className="error" role="alert"><p>{error}</p><button className="button" disabled={loading} onClick={() => {
          setLoading(true); setAttempt(value => value + 1);
        }}>Retry loading tasks</button></div>}
        {!loading && !error && tasks.length === 0 && <p className="empty">No tasks yet. Add something you want to work on.</p>}
        <ul className="task-list" aria-label="Tasks">
          {tasks.map(task => <TaskCard key={task.id} task={task} selected={selectedId === task.id} onUpdate={updateTask}
            onNotes={() => selectNotes(task.id)} onDelete={async id => {
              await apiRequest<void>(`/api/tasks/${id}`, { method: "DELETE" });
              setTasks(current => current.filter(item => item.id !== id));
              if (selectedId === id) setSelectedId(null);
              setNotesVersion(value => value + 1);
              setMessage("Task deleted. Its notes are available in General notes.");
              requestAnimationFrame(() => document.getElementById("tasks-heading")?.focus());
            }} />)}
        </ul>
      </section>
    </div>
    <NotesPanel key={`${selectedTask?.id ?? "general"}-${notesVersion}`} task={selectedTask} onGeneralNotes={() => selectNotes(null)} />
  </div>;
}
