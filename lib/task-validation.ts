import type { UpdateTaskInput } from "../types/task.ts";

type ValidationResult = { data: UpdateTaskInput; error?: never } | { error: string; data?: never };

/** Validate only supplied fields and construct an allowlisted update payload. */
export function validateTaskFields(body: unknown, mode: "create" | "update"): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Expected a JSON object." };
  }
  const fields = body as Record<string, unknown>;
  const input: UpdateTaskInput = {};

  if (mode === "create" || "title" in fields) {
    if (typeof fields.title !== "string" || !fields.title.trim() || fields.title.trim().length > 200) {
      return { error: "Title must contain between 1 and 200 characters." };
    }
    input.title = fields.title.trim();
  }
  if ("description" in fields) {
    if (fields.description !== null && (typeof fields.description !== "string" || fields.description.length > 10000)) {
      return { error: "Description must be a string of at most 10000 characters or null." };
    }
    input.description = typeof fields.description === "string" ? fields.description.trim() : null;
  }
  if ("priority" in fields) {
    if (fields.priority !== "low" && fields.priority !== "medium" && fields.priority !== "high") {
      return { error: "Priority must be low, medium, or high." };
    }
    input.priority = fields.priority;
  }
  if ("due_date" in fields) {
    const value = fields.due_date;
    if (value !== null) {
      const date = typeof value === "string" ? new Date(value) : null;
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return { error: "Due date must be a valid YYYY-MM-DD date or null." };
      }
    }
    input.due_date = value;
  }
  if (mode === "update" && "completed" in fields) {
    if (typeof fields.completed !== "boolean") return { error: "Completed must be a boolean." };
    input.completed = fields.completed;
  }
  if (mode === "update" && Object.keys(input).length === 0) {
    return { error: "Provide at least one editable task field." };
  }
  return { data: input };
}
