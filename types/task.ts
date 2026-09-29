import type { InitialTaskNote } from "./note.ts";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: TaskPriority;
  /** ISO date string, or null when no due date is set. */
  due_date: string | null;
  /** ISO timestamp strings returned by the database. */
  created_at: string;
  updated_at: string;
}

export type CreateTaskInput = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "completed" | "priority" | "due_date">>;

/** Omitted fields stay unchanged; null clears description or due_date. */
export type UpdateTaskInput = Partial<CreateTaskInput>;

export type CreateTaskRequest = CreateTaskInput & { notes?: InitialTaskNote[] };
