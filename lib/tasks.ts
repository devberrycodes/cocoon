import { supabase } from "./supabase.ts";
import type { CreateTaskInput, Task } from "../types/task.ts";

const taskColumns =
  "id, title, description, completed, priority, due_date, created_at, updated_at";

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

  if (error || !data) {
    // Temporary server-side diagnostic; never include this error in the response.
    console.error("Supabase task insert failed:", error);
    throw new Error("Unable to create task.");
  }
  return data;
}
