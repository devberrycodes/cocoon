import { validateInitialNotes } from "../../../lib/initial-notes-validation.ts";
import { createTask, listTasks } from "../../../lib/tasks.ts";
import { validateTaskFields } from "../../../lib/task-validation.ts";
import type { CreateTaskInput } from "../../../types/task.ts";

export async function GET() {
  try {
    return Response.json(await listTasks(), { status: 200 });
  } catch {
    return Response.json({ error: "Unable to fetch tasks." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateTaskFields(body, "create");
  if (result.error !== undefined) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const notes = validateInitialNotes((body as Record<string, unknown>).notes);
  if (notes.error !== undefined) return Response.json({ error: notes.error }, { status: 400 });
  const input: CreateTaskInput = {
    title: result.data.title ?? "",
    description: result.data.description ?? null,
    priority: result.data.priority ?? "medium",
    due_date: result.data.due_date ?? null,
    completed: false,
  };

  try {
    return Response.json(await createTask(input, notes.data), { status: 201 });
  } catch (error) {
    console.error("Unexpected task creation error:", error);
    return Response.json({ error: "Unable to create task." }, { status: 500 });
  }
}
