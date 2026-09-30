import { authContext } from "./auth-server";
import type { InitialTaskNote } from "../types/note";
import { supabase } from "./supabase";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "../types/task";

const taskColumns =
  "id, title, description, completed, priority, due_date, created_at, updated_at, is_sample";

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", authContext().userId)
    .eq("id", id)
    .maybeSingle<Task>();

  if (error) {
    console.error("Supabase task fetch error:", error);
    throw new Error("Unable to fetch task.");
  }

  return data;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", authContext().userId)
    .eq("id", id)
    .select(taskColumns)
    .maybeSingle<Task>();

  if (error) {
    console.error("Supabase task update error:", error);
    throw new Error("Unable to update task.");
  }

  return data;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", authContext().userId)
    .eq("id", id)
    .select("id")
    .maybeSingle<Pick<Task, "id">>();

  if (error) {
    console.error("Supabase task delete error:", {
      code: error.code,
    });

    throw new Error("Unable to delete task.");
  }

  return data !== null;
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", authContext().userId)
    .order("created_at", { ascending: false })
    .returns<Task[]>();

  if (error || !data) {
    console.error("Supabase task list error:", error);
    throw new Error("Unable to fetch tasks.");
  }

  return data;
}

export async function createTask(
  input: CreateTaskInput,
  notes: InitialTaskNote[] = []
): Promise<Task> {
  if (notes.length > 0) {
    const { data: result, error } = await supabase.rpc(
      "create_task_with_notes",
      {
        p_task: input,
        p_notes: notes,
      }
    );

    const data: unknown = result;

    if (error || !isTask(data)) {
      console.error("Supabase task and notes insert error:", {
        code: error?.code,
      });

      throw new Error("Unable to create task.");
    }

    return data;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...input,
      user_id: authContext().userId,
      is_sample: false,
    })
    .select(taskColumns)
    .single<Task>();

  if (error) {
    console.error("Supabase task insert error:", error);
    throw new Error("Unable to create task.");
  }

  if (!data) {
    throw new Error("Unable to create task.");
  }

  return data;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") {
    return false;
  }

  const task = value as Record<string, unknown>;

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (task.description === null ||
      typeof task.description === "string") &&
    typeof task.completed === "boolean" &&
    ["low", "medium", "high"].includes(String(task.priority)) &&
    (task.due_date === null ||
      typeof task.due_date === "string") &&
    typeof task.created_at === "string" &&
    typeof task.updated_at === "string" &&
    (task.is_sample === undefined ||
      typeof task.is_sample === "boolean")
  );
}