import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Task } from "../types/task.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cocoon-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
const { GET, PATCH, DELETE } = await import("../app/api/tasks/[id]/route.ts");
const { supabase } = await import("../lib/supabase.ts");
const task: Task = {
  id: "00000000-0000-4000-8000-000000000001", title: "Plan today", description: "Notes",
  completed: false, priority: "medium", due_date: "2026-10-01",
  created_at: "2026-09-29T10:00:00.000Z", updated_at: "2026-09-29T10:00:00.000Z",
};
let stored: Task | null;
let calls: Request[];
let logs: unknown[][];
let failure: boolean;

beforeEach(() => {
  stored = { ...task };
  calls = [];
  logs = [];
  failure = false;
  mock.method(console, "error", (...args: unknown[]) => { logs.push(args); });
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    calls.push(request);
    assert.equal(new URL(request.url).searchParams.get("id"), `eq.${task.id}`);
    if (failure) return Response.json({ code: "42501", message: "private SQL details" }, { status: 403 });
    if (request.method === "GET") return Response.json(stored ? [stored] : []);
    if (request.method === "PATCH") {
      const changes = await request.clone().json();
      if (stored) stored = { ...stored, ...changes };
      return Response.json(stored ? [stored] : []);
    }
    if (request.method === "DELETE") {
      const result = stored ? { id: stored.id } : null;
      stored = null;
      return Response.json(result ? [result] : []);
    }
    throw new Error("Unexpected database method");
  });
});
afterEach(() => mock.restoreAll());

function context(id = task.id) { return { params: Promise.resolve({ id }) }; }
function request(method: string, body?: unknown) {
  return new Request(`http://localhost/api/tasks/${task.id}`, {
    method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

test("GET returns the matching task", async () => {
  const response = await GET(request("GET"), context());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), task);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
});

test("PATCH changes only supplied fields and generates updated_at", async () => {
  const before = Date.now();
  const response = await PATCH(request("PATCH", { title: "  New title  ", updated_at: "injected", id: "injected" }), context());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.title, "New title");
  assert.equal(result.id, task.id);
  assert.equal(result.description, task.description);
  assert.equal(result.priority, task.priority);
  assert.equal(result.completed, false);
  assert.equal(result.due_date, task.due_date);
  assert.equal(result.created_at, task.created_at);
  assert.ok(Date.parse(result.updated_at) >= before && Date.parse(result.updated_at) <= Date.now());
  const sent = await calls[0].json();
  assert.deepEqual(Object.keys(sent).sort(), ["title", "updated_at"]);
});

test("PATCH completes and uncompletes tasks", async () => {
  for (const completed of [true, false]) {
    const response = await PATCH(request("PATCH", { completed }), context());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).completed, completed);
  }
});

test("PATCH clears nullable fields without changing other fields", async () => {
  const response = await PATCH(request("PATCH", { description: null, due_date: null }), context());
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.description, null);
  assert.equal(result.due_date, null);
  assert.equal(result.title, task.title);
});

for (const priority of ["low", "medium", "high"]) {
  test(`PATCH accepts ${priority} priority and valid optional fields`, async () => {
    const response = await PATCH(request("PATCH", { priority, description: " Updated notes ", due_date: "2028-02-29" }), context());
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.priority, priority);
    assert.equal(result.description, "Updated notes");
    assert.equal(result.due_date, "2028-02-29");
  });
}

test("DELETE returns an empty 204 and subsequent reads/deletes return 404", async () => {
  const response = await DELETE(request("DELETE"), context());
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal((await GET(request("GET"), context())).status, 404);
  assert.equal((await DELETE(request("DELETE"), context())).status, 404);
});

for (const [name, handler] of [["GET", GET], ["PATCH", PATCH], ["DELETE", DELETE]] as const) {
  test(`${name} returns 404 for a missing task`, async () => {
    stored = null;
    const response = await handler(request(name, name === "PATCH" ? { completed: true } : undefined), context());
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Task not found." });
  });
  test(`${name} rejects an invalid ID before querying`, async () => {
    const response = await handler(request(name, name === "PATCH" ? { completed: true } : undefined), context("invalid"));
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  });
  test(`${name} logs database errors and returns a generic 500`, async () => {
    failure = true;
    const response = await handler(request(name, name === "PATCH" ? { completed: true } : undefined), context());
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes("private SQL"), false);
    assert.ok(logs.some(args => JSON.stringify(args).includes("42501")));
  });
  test(`${name} handles unexpected thrown failures`, async () => {
    mock.method(supabase, "from", () => { throw new Error("private failure"); });
    const response = await handler(request(name, name === "PATCH" ? { completed: true } : undefined), context());
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes("private failure"), false);
    assert.ok(logs.length > 0);
  });
}

const invalidBodies: unknown[] = [
  {}, null, [], "task", { updated_at: "injected" }, { title: "" }, { title: "   " },
  { title: null }, { title: 1 }, { title: "a".repeat(201) }, { completed: "true" },
  { completed: null }, { priority: "urgent" }, { priority: null }, { description: 12 },
  { description: "a".repeat(10001) }, { due_date: "2026-02-29" }, { due_date: "2026-02-30" },
  { due_date: "tomorrow" }, { due_date: 123 }, { due_date: "" },
];
for (const [index, body] of invalidBodies.entries()) {
  test(`PATCH rejects invalid payload ${index + 1} without a database call`, async () => {
    const response = await PATCH(request("PATCH", body), context());
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
    assert.equal(calls.length, 0);
  });
}

test("PATCH rejects malformed JSON", async () => {
  const response = await PATCH(new Request("http://localhost/api/tasks/id", { method: "PATCH", body: "{" }), context());
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});
