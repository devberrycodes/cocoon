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
The initial migration used `ON DELETE SET NULL`; the current migration below
changes this to `ON DELETE CASCADE` for task notes. A trigger maintains `updated_at`, including when a task is unlinked.
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

## Independent clipboard copies and simple deletion

Run **all of `migrations/20260929000004_simplify_clipboard_notes.sql`** in the
Supabase SQL Editor before using this version. The tasks/notes tables and their
existing anonymous CRUD policies must already exist. This migration works with
or without migration 00003; do not run 00003 after 00004.

The migration adds `source_task_title` if missing, replaces the task-note foreign
key with **ON DELETE CASCADE**, updates atomic initial task/note creation, adds
`save_note_with_clipboard`, and removes the obsolete keep/delete RPC. It does
not delete existing records. Future task deletions permanently delete attached
notes. General notes (`task_id = null`) remain independent and are never cascaded.
Previously detached notes remain general notes; no original association is guessed.

Both functions use security invoker permissions and existing RLS. No privileged
key is used. Do not apply schema changes with the app's public key. Apply the
migration before deploying this code, since the old foreign key preserves task
notes instead of deleting them.

- `DELETE /api/tasks/:id` simply deletes the task; the database cascades task notes.
  There is no keep/delete query option or multi-choice dialog.
- POST and PATCH notes accept `add_to_clipboard: true` for a task note. The task
  note stays attached and a separate general note is created with the task title
  derived server-side. Both writes are atomic. The response is the task note.
- Clipboard copies are snapshots, not synchronised links. Editing or deleting
  either note does not affect the other. Each save with the toggle on creates a
  new copy; the UI defaults the toggle to off. Turning it off does not delete an
  existing copy. General note forms do not offer this task-only toggle.
- `POST /api/tasks` accepts optional `notes: [{ content, add_to_clipboard }]`
  (up to 50). Each entry creates a task note; checked entries also create a copy.
- Task PATCH never edits notes. Descriptions are not notes and are deleted with
  the task; they are never copied automatically.

New/supplied due dates must be today or later (UTC calendar day). PATCH requests
that omit due_date preserve it. The clipboard color menu saves through the notes API after the color migration below.

After the migration, optionally run `supabase/tests/task_note_lifecycle.sql` in
the SQL Editor. It exercises the real functions and cascading relationship using
transaction-local fixtures and ends with ROLLBACK. API tests use mocked Supabase
responses and cannot verify your live foreign key or RLS configuration.

## Persistent note colors

After migration 00004, run the entire
`migrations/20260929000005_persist_note_colors.sql` file in Supabase SQL Editor.
It adds `color` with default `cream`, backfills unset values, limits it to
`cream`, `pink`, or `sage`, and updates the atomic note-copy function to preserve
colors. Existing task/note content and RLS policies are unchanged. The agent has
not applied it using the public key.

POST notes accepts optional `color`; PATCH accepts `{ "color": "pink" }` without
requiring content. GET returns the saved color. Omitted colors default to cream
for new notes and remain unchanged on edits. Invalid colors return 400. Copies
remain independent, including their colors. Apply the migration before deploying
this version: queries now select the color column.
