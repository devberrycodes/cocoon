import { validId } from "../../../../lib/validation.ts";
import { deleteTask, getTask, updateTask } from "../../../../lib/tasks.ts";
import { validateTaskFields } from "../../../../lib/task-validation.ts";

type TaskContext = { params: Promise<{ id: string }> };


function notFound() {
  return Response.json({ error: "Task not found." }, { status: 404 });
}

export async function GET(_request: Request, context: TaskContext) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return Response.json({ error: "Invalid task ID." }, { status: 400 });
    const task = await getTask(id);
    return task ? Response.json(task) : notFound();
  } catch (error) {
    console.error("Unexpected task fetch error:", error);
    return Response.json({ error: "Unable to fetch task." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: TaskContext) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return Response.json({ error: "Invalid task ID." }, { status: 400 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const result = validateTaskFields(body, "update");
    if (result.error !== undefined) return Response.json({ error: result.error }, { status: 400 });
    const task = await updateTask(id, result.data);
    return task ? Response.json(task) : notFound();
  } catch (error) {
    console.error("Unexpected task update error:", error);
    return Response.json({ error: "Unable to update task." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: TaskContext) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return Response.json({ error: "Invalid task ID." }, { status: 400 });
    return await deleteTask(id) ? new Response(null, { status: 204 }) : notFound();
  } catch (error) {
    console.error("Unexpected task deletion error:", error);
    return Response.json({ error: "Unable to delete task." }, { status: 500 });
  }
}
