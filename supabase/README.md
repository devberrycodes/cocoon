# Task database access

The application uses the existing public Supabase URL and anon key. It does not
use a service-role key or authenticate users. Tasks are currently a shared list,
not private per-user data.

## Apply the task access fix

The live insert diagnostic returned PostgreSQL error `42501`:
`new row violates row-level security policy for table "tasks"`.
All eight task columns were accepted by a zero-row SELECT using the same key.

Run `migrations/20260929000000_allow_anonymous_task_creation.sql` once in the
Supabase SQL Editor for the project configured in `.env.local`, using the
database-owner session. Do not change the app's key or disable RLS.

This migration enables anonymous SELECT and INSERT on `public.tasks`. SELECT is
needed both for listing tasks and returning the inserted row. Anyone with the
public project key can read and create tasks, including through the Supabase
Data API directly. The migration does not add UPDATE or DELETE policies, remove
existing policies, or change table columns.

The anon key cannot inspect or modify policies. To review existing policies in
the SQL Editor, run:

```sql
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'tasks';
```

Existing restrictive policies still apply; review any such policy rather than
removing it blindly. After applying the migration, retry POST `/api/tasks` with
`{"title":"Test task"}` and confirm status 201, then confirm GET returns it.
This verification creates a real task. The migration has not been applied by
the coding agent because only the public API credentials were available.

## Individual task routes

After the first migration, apply
`migrations/20260929000001_allow_anonymous_task_updates_and_deletion.sql`
in the SQL Editor to enable PATCH and DELETE for the current anonymous client.
This extends the shared list model: anyone with the public key can update and
delete visible tasks. RLS stays enabled; existing restrictive policies still
apply. This migration has not been applied by the coding agent.

The API sets `updated_at` on each PATCH, preserves omitted fields, and allows
`null` to clear description and due date. DELETE returns an empty 204 only when
a deleted row is returned. A row hidden by RLS is indistinguishable from a
missing row to the anonymous client and therefore returns 404.

Database errors are logged server-side. API errors remain generic and do not
expose database details. Automated endpoint tests use mocked database responses
and do not update or delete live tasks.

## Notes

Apply `migrations/20260929000002_create_notes.sql` once in the Supabase SQL
Editor. It creates the notes table, content constraints, timestamps, task
foreign key, index, and anonymous CRUD policies for the same shared no-auth
model as tasks. Notes are publicly accessible to anyone with the project key.
Deleting a task sets its notes' `task_id` to null so they remain in General
notes. A trigger maintains `updated_at`, including when a task is unlinked.
The app's public key cannot apply this migration.

Notes endpoints:

- `GET /api/notes`: all notes, newest first.
- `GET /api/notes?task_id=<uuid>`: notes for a task.
- `GET /api/notes?task_id=null`: standalone notes.
- `POST /api/notes`: `{ "content": "Note text", "task_id": null }`; task ID is optional.
- `GET /api/notes/<uuid>`: one note.
- `PATCH /api/notes/<uuid>`: supplied `content` and/or `task_id` fields only.
- `DELETE /api/notes/<uuid>`: empty 204 on success.

Content is trimmed and must contain 1–10000 characters. Invalid input returns
400, missing notes or linked tasks return 404, and database failures return a
generic 500. Detailed row contents are not returned in API errors.

Run `npm test` (Node 22.6+ with TypeScript stripping, or Node 24),
`npm run lint`, `npx tsc --noEmit`, and `npm run build` to verify changes.
Tests mock Supabase HTTP responses and never modify live data. Existing task
CRUD tests are retained alongside the notes tests.
