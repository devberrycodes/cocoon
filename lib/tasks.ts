import { supabase } from "./supabase.ts";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/task.ts";

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

export async function deleteTask(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("tasks")
    .delete().eq("id", id).select("id").maybeSingle<Pick<Task, "id">>();
  if (error) {
    console.error("Supabase task delete error:", error);
    throw new Error("Unable to delete task.");
  }
  return data !== null;
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

export async function createTask(input: CreateTaskInput): Promise<Task> {
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
