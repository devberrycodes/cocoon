import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Task } from "../types/task.ts";

// Never load real credentials or contact a live database in endpoint tests.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cocoon-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
const { GET, POST } = await import("../app/api/tasks/route.ts");

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Plan today",
  description: null,
  completed: false,
  priority: "medium",
  due_date: null,
  created_at: "2026-09-29T10:00:00.000Z",
  updated_at: "2026-09-29T10:00:00.000Z",
};
let calls: Request[];
let databaseReply: () => Response | Promise<Response>;

beforeEach(() => {
  calls = [];
  mock.method(console, "error", () => {});
  databaseReply = () => Response.json([]);
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(input, init));
    return databaseReply();
  });
});
afterEach(() => mock.restoreAll());

test("POST logs the complete Supabase error without exposing it in the response", async () => {
  const log = mock.method(console, "error", () => {});
  const error = {
    code: "42501",
    message: 'new row violates row-level security policy for table "tasks"',
    details: "Database diagnostic details",
    hint: "Database diagnostic hint",
  };
  databaseReply = () => Response.json(error, { status: 403 });
  const response = await post({ title: "Task" });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to create task." });
  assert.deepEqual(log.mock.calls[0].arguments, ["Supabase task insert error:", error]);
});

test("POST logs unexpected thrown errors without exposing them in the response", async () => {
  const { supabase } = await import("../lib/supabase.ts");
  const error = new Error("Unexpected internal failure");
  mock.method(supabase, "from", () => { throw error; });
  const log = mock.method(console, "error", () => {});
  const response = await post({ title: "Task" });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to create task." });
  assert.deepEqual(log.mock.calls[0].arguments, ["Unexpected task creation error:", error]);
});

function post(body: unknown) {
  return POST(new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

test("GET returns tasks and requests newest-first ordering", async () => {
  const older = { ...task, id: "older", created_at: "2026-09-28T10:00:00.000Z" };
  databaseReply = () => Response.json([task, older]);
  const response = await GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), [task, older]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, "/rest/v1/tasks");
  assert.equal(url.searchParams.get("order"), "created_at.desc");
});

test("GET returns an empty array when no tasks exist", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test("POST trims the title, applies defaults, and ignores protected fields", async () => {
  databaseReply = () => Response.json(task, { status: 201 });
  const response = await post({ title: "  Plan today  ", id: "injected", completed: true, created_at: "injected" });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), task);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(await calls[0].json(), {
    title: task.title, description: null, completed: false, priority: "medium", due_date: null,
  });
  assert.match(calls[0].headers.get("prefer") ?? "", /return=representation/);
});

for (const priority of ["low", "medium", "high"] as const) {
  test(`POST accepts ${priority} priority and optional fields`, async () => {
    const created = { ...task, priority, description: "Notes", due_date: "2096-02-29" };
    databaseReply = () => Response.json(created, { status: 201 });
    const response = await post({ title: task.title, priority, description: " Notes ", due_date: "2096-02-29" });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), created);
    assert.deepEqual(await calls[0].json(), {
      title: task.title, priority, description: "Notes", due_date: "2096-02-29", completed: false,
    });
  });
}

test("POST accepts null optional description and due date", async () => {
  databaseReply = () => Response.json(task, { status: 201 });
  assert.equal((await post({ title: task.title, description: null, due_date: null })).status, 201);
});

const invalidBodies: [string, unknown][] = [
  ["missing title", {}], ["empty title", { title: "" }], ["whitespace title", { title: " \n " }],
  ["non-string title", { title: 42 }], ["long title", { title: "a".repeat(201) }],
  ["null body", null], ["array body", []], ["primitive body", "task"],
  ["invalid priority", { title: "Task", priority: "urgent" }],
  ["null priority", { title: "Task", priority: null }],
  ["non-string description", { title: "Task", description: {} }],
  ["long description", { title: "Task", description: "a".repeat(10001) }],
  ["invalid date", { title: "Task", due_date: "tomorrow" }],
  ["impossible date", { title: "Task", due_date: "2026-02-30" }],
  ["non-leap date", { title: "Task", due_date: "2026-02-29" }],
  ["non-string date", { title: "Task", due_date: 123 }],
];
for (const [name, body] of invalidBodies) {
  test(`POST rejects ${name} without a database call`, async () => {
    const response = await post(body);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
    assert.equal(calls.length, 0);
  });
}

test("POST rejects malformed JSON", async () => {
  const response = await POST(new Request("http://localhost/api/tasks", { method: "POST", body: "{" }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON body." });
  assert.equal(calls.length, 0);
});

for (const method of ["GET", "POST"] as const) {
  for (const failure of ["database", "network", "missing data"] as const) {
    test(`${method} returns a safe 500 on ${failure} failure`, async () => {
      databaseReply = () => {
        if (failure === "network") throw new Error("private connection details");
        if (failure === "missing data") return Response.json(null);
        return Response.json({ message: "private SQL details", code: "42501" }, { status: 403 });
      };
      const response = method === "GET" ? await GET() : await post({ title: "Task" });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: method === "GET" ? "Unable to fetch tasks." : "Unable to create task.",
      });
    });
  }
}
