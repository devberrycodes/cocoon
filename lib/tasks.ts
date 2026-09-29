import type { InitialTaskNote } from "../types/note.ts";
import { supabase } from "./supabase.ts";
import type { CreateTaskInput, Task, TaskNoteAction, UpdateTaskInput } from "../types/task.ts";

const taskColumns =
  "id, title, description, completed, priority, due_date, created_at, updated_at";

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase.from("tasks")
    .select(taskColumns).eq("id", id).maybeSingle<Task>();
  if (error) {
    console.error("Supabase task fetch error:", error);
    throw new Error("Unable to fetch task.");
  }
  return data;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  const { data, error } = await supabase.from("tasks")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id).select(taskColumns).maybeSingle<Task>();
  if (error) {
    console.error("Supabase task update error:", error);
    throw new Error("Unable to update task.");
  }
  return data;
}

export class TaskNotesChoiceRequiredError extends Error {}

export async function deleteTask(id: string, noteAction?: TaskNoteAction): Promise<boolean> {
  const { data: result, error } = await supabase.rpc("delete_task_with_notes", {
    p_task_id: id, p_note_action: noteAction ?? null,
  });
  const data: unknown = result;
  if (error) {
    console.error("Supabase task delete error:", { code: error.code });
    throw new Error("Unable to delete task.");
  }
  if (!data || typeof data !== "object" || !("status" in data)) throw new Error("Unable to delete task.");
  if (data.status === "notes_choice_required") throw new TaskNotesChoiceRequiredError();
  if (data.status === "not_found") return false;
  if (data.status !== "deleted") throw new Error("Unable to delete task.");
  return true;
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .order("created_at", { ascending: false })
    .returns<Task[]>();

  if (error || !data) throw new Error("Unable to fetch tasks.");
  return data;
}

export async function createTask(input: CreateTaskInput, notes: InitialTaskNote[] = []): Promise<Task> {
  if (notes.length > 0) {
    const { data: result, error } = await supabase.rpc("create_task_with_notes", { p_task: input, p_notes: notes });
    const data: unknown = result;
    if (error || !isTask(data)) {
      console.error("Supabase task and notes insert error:", { code: error?.code });
      throw new Error("Unable to create task.");
    }
    return data;
  }
  const { data, error } = await supabase
    .from("tasks")
    .insert(input)
    .select(taskColumns)
    .single<Task>();

  if (error) {
    console.error("Supabase task insert error:", error);
    throw new Error("Unable to create task.");
  }
  if (!data) throw new Error("Unable to create task.");
  return data;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return typeof task.id === "string" && typeof task.title === "string" &&
    (task.description === null || typeof task.description === "string") &&
    typeof task.completed === "boolean" && ["low", "medium", "high"].includes(String(task.priority)) &&
    (task.due_date === null || typeof task.due_date === "string") &&
    typeof task.created_at === "string" && typeof task.updated_at === "string";
}
