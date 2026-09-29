# Private anonymous workspaces

1. In Supabase Authentication settings, enable **Anonymous Sign-Ins**.
2. In SQL Editor, run the complete file
   `supabase/migrations/20260929000006_user_data_isolation.sql` after migrations
   00000–00005. This is the exact deployment SQL; do not use the public key to run it.
3. Deploy/restart the updated app only after the migration succeeds. Until then,
   the old broad policies still permit shared access through the public database API.
4. Optionally run `supabase/isolation-check.sql` in SQL Editor. It creates two test
   users and records inside a transaction, checks actual RLS, then rolls everything
   back. If a check raises an exception, roll back the transaction before retrying.
5. Open Cocoon in two separate browser profiles. Create different tasks and notes;
   neither profile should see the other's data. Reload each to verify persistence.

The browser persists its anonymous session using Supabase's storage and token
refresh. Initialization shares one promise and uses a browser lock where available
so concurrent tabs recheck the saved session before creating a user. Requests send
only that session's access token to the same-origin API. The API validates it with
Supabase Auth, constructs a request-scoped database client, and filters by owner.
Missing/invalid authentication returns 401; another owner's UUID returns 404.

All new task/note inserts get the verified user's ID. Existing invoker RPCs inherit
`auth.uid()` defaults for initial notes and clipboard copies and obey RLS. Notes
cannot be linked to another user's task, including through direct REST writes.

Existing rows retain a null owner and are invisible to all app users. Nothing is
claimed automatically or deleted by this migration. If you need to recover old
records, explicitly assign known records to the intended auth.users ID in SQL
Editor; never assign all rows to whichever visitor arrives first.

Anonymous identity belongs to the browser session, not a recoverable account.
Clearing site data, switching browsers, or losing the session means losing access
to those records. No email/password login or account recovery is added here.

Tests use mocked Auth/PostgREST boundaries and do not prove deployed RLS. Run the
SQL check after migration for database enforcement. No service-role key is used.
