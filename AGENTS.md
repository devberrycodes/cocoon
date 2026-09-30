# Cocoon Development Instructions

These instructions apply throughout this repository. Keep changes appropriate in scope.

## 1. Purpose and Required Features

Cocoon is a cozy productivity application that helps users organise tasks, capture notes, and focus on one thing at a time in a calm environment.

The intended feature set is:

- Create, view, edit, and delete tasks.
- Complete and uncomplete tasks.
- Notes.
- Task priorities.
- Due dates.
- Focus Mode.
- Focus timer.
- Spotify playlist integration.

Preserve working features when implementing another. This list defines product scope; it is not an instruction to implement every feature during every task. Do not add unrelated features or assume unspecified product behaviour.

## 2. Tech Stack and Scope

- Next.js App Router and React.
- TypeScript for application code.
- Tailwind CSS for styling.
- Supabase with PostgreSQL for persistence.
- Spotify Web API for playlist integration.

Use the existing dependencies and package manager. Inspect `package.json` before choosing commands or libraries. Add a dependency only when required and explain why existing tools are insufficient. Do not introduce additional frameworks, infrastructure, or abstractions without a concrete need.

## 3. Architecture

Follow the repository's existing structure, currently rooted in `app/`, and extend it incrementally.

- Keep UI components focused on presentation and interaction.
- Keep request/response handling in API route handlers.
- Put database access in small, reusable modules outside presentation components.
- Isolate Spotify integration from task persistence and task behaviour.
- Reuse shared entity types, API contracts, validation, and utilities.
- Extract components or modules when this improves responsibility boundaries or removes meaningful duplication.

Do not scaffold speculative folder hierarchies or introduce service/repository layers that the application does not need. Explain significant architectural changes.

## 4. TypeScript and React Conventions

- Use explicit shared types for database entities and API payloads/responses.
- Avoid `any`; use `unknown` and narrow untrusted values.
- Validate external data at runtime; TypeScript types alone do not validate input.
- Do not suppress type errors or use assertions to bypass an unresolved problem.
- Follow existing naming, formatting, and import conventions.
- Keep components small enough to understand and focused on one responsibility.
- Use stable identifiers for list keys and update state immutably.
- Follow the Rules of Hooks. Use effects for synchronising with external systems, not for values that can be derived during rendering.
- Clean up timers, listeners, and subscriptions; avoid stale state in timer callbacks.
- Reuse UI and behaviour where helpful without premature abstraction.

## 5. Next.js Frontend and Backend Conventions

- Follow App Router file conventions such as `page.tsx`, `layout.tsx`, and `route.ts`.
- Prefer Server Components for rendering that does not require browser interaction.
- Add `"use client"` only at boundaries requiring state, effects, event handlers, or browser APIs.
- Keep privileged database access, private credentials, and Spotify token exchange on the server. Never import server-only modules into client components.
- Pass only serialisable, client-safe data across server/client boundaries.
- Keep route handlers thin by calling shared validation and data-access modules where appropriate.
- After mutations, update or refresh affected UI data so task lists and task details stay consistent.
- Provide loading, empty, and error states where applicable; prevent accidental duplicate submissions while requests are pending.

## 6. Supabase and Database Conventions

- Use Supabase/PostgreSQL and descriptive table and column names.
- Keep database queries out of presentation components and reuse appropriate client setup.
- Validate data before writes and enforce relevant constraints in the database as well.
- Keep schema changes reproducible in version-controlled migrations or the established schema workflow. Do not rely on undocumented dashboard changes.
- Select and return only the data needed by the caller.
- Treat database errors and missing records as distinct outcomes.
- For tables exposed through Supabase's client API, enable Row Level Security and define policies appropriate to the application's access model.
- Where data belongs to a user, verify ownership for reads and mutations. Never trust a client-supplied user ID as proof of access.
- Do not introduce authentication solely because these instructions mention access control; clarify the intended access model when implementation requires it.
- Avoid destructive schema or bulk-data operations unless explicitly required. Explain their impact before proceeding.
- Define consistent date storage and timezone handling so due dates do not shift unexpectedly.

## 7. API Design and Validation

Every API endpoint must:

- Use HTTP methods appropriate to the operation; never mutate data through GET.
- Validate route parameters, query parameters, and request bodies on the server.
- Handle malformed JSON, wrong types, missing required fields, and invalid identifiers gracefully.
- Trim text where appropriate and reject empty required text. Validate allowed priority values, dates, and sensible field lengths.
- Allow only supported writable fields; do not pass arbitrary request objects directly into database writes.
- For partial updates, distinguish omitted fields from explicit values or permitted clearing of a field.
- Return a consistent JSON contract, including a predictable error shape, without exposing internals.
- Apply authentication and authorisation checks when the endpoint's access model requires them.

Use appropriate status codes:

| Status | Use |
| --- | --- |
| 200 | Successful read, update, or delete with a JSON response |
| 201 | Resource created |
| 400 | Malformed or invalid input |
| 401 | Authentication required or invalid |
| 403 | Authenticated caller lacks permission |
| 404 | Resource not found |
| 405 | Unsupported method; use framework handling where appropriate |
| 409 | Conflict with current resource state, where applicable |
| 500 | Unexpected server failure |

Application-controlled responses should use JSON consistently; do not force JSON bodies onto framework-generated responses or protocols that require redirects.

## 8. Error Handling and Resilience

- Handle failures at request, persistence, and external-service boundaries.
- Show clear, actionable user messages and preserve entered data when a request fails.
- Do not silently swallow failures or show success before an operation succeeds. If using optimistic updates, restore state on failure.
- Log useful server-side diagnostic context without credentials, tokens, or sensitive task/note contents.
- Never return stack traces, SQL details, secrets, or raw provider errors to the client.
- Spotify failures must not prevent task management or the focus timer from functioning. Provide an understandable unavailable/retry state.

## 9. Security and Environment Variables

- Never hardcode or commit secrets, real `.env` files, or `.env.local`.
- Use `NEXT_PUBLIC_*` only for values safe to expose in the browser. That prefix makes a value public.
- Keep Supabase service-role/privileged keys, Spotify client secrets, and private access/refresh credentials server-side.
- A Supabase publishable/anon key may be public only with appropriate database access policies; it is not a replacement for authorisation.
- When setup documentation is needed, document variable names and placeholder values only.
- Do not print environment contents or credentials in logs, tool output, screenshots, or error responses.
- Treat task text, notes, and external data as untrusted. Render text safely; avoid raw HTML unless required and safely sanitised.
- If implementing Spotify OAuth, validate callback state and keep token handling isolated in the integration module.

## 10. Testing and Verification

Write tests for new or changed API endpoints. Cover the following where applicable to that endpoint:

- Successful requests and expected response/status contracts.
- Malformed input, invalid values, and missing required fields.
- Missing resources.
- Update behaviour, including preservation of omitted fields.
- Delete behaviour and the resulting resource state.
- Database/provider failures and safe error responses.
- Authentication and ownership boundaries when present.

Test behaviour rather than mirroring implementation details. Use isolated fixtures or mocked external boundaries; never run destructive tests against production data or require live Spotify credentials.

Run relevant tests after backend changes. Add focused tests for meaningful application logic, such as timer transitions or date handling, when changed.

For feature work and significant code changes, run:

- The relevant test commands configured in `package.json`.
- `npm run lint`.
- `npx tsc --noEmit` for explicit TypeScript validation.
- `npm run build`.

The repository currently has no test script or test runner. Do not claim tests ran when they are not configured. When endpoint work requires tests, add only the minimal suitable setup and document its command.

Manually verify affected user flows and responsive/keyboard behaviour. For documentation-only edits, review the diff and formatting; application tests and builds are unnecessary. Report failed or unavailable checks honestly, including pre-existing failures.

## 11. Visual Design, Accessibility, and Responsiveness

Cocoon should feel calm, cozy, and focused:

- Use a pastel, pixel-art inspired environment and soft whimsical atmosphere.
- Use deep burgundy/red as a major brand accent.
- Maintain comfortable spacing, readable typography, and clear hierarchy.
- Keep functionality usable without decorative artwork.

Every major screen must work on mobile, tablet, and desktop. Avoid reliance on a single viewport size, prevent unintended horizontal overflow, and make controls comfortable to use on touch screens.

- Use semantic HTML and native interactive elements where possible.
- Make every control keyboard accessible with a visible focus indicator.
- Give buttons understandable names and inputs associated labels.
- Connect validation messages to their inputs and announce meaningful asynchronous status changes where needed.
- Manage focus appropriately in dialogs and return it to the triggering control on close.
- Maintain readable contrast and never use colour alone to indicate priority, completion, or errors.
- Use meaningful alt text for informative images and empty alt text for decorative images.
- Respect reduced-motion preferences for decorative animation.

## 12. Git and Commit Conventions

Use Conventional Commits with one of these prefixes:

`feat:`, `fix:`, `refactor:`, `style:`, `test:`, `docs:`, `chore:`, `perf:`

Use a concise, lowercase subject describing the actual change. Keep commits small and focused. Do not combine unrelated work into one commit.

Examples:

- `feat: add task creation endpoint`
- `fix: prevent empty task submissions`
- `style: add cocoon burgundy button states`
- `test: add task api validation tests`
- `docs: update setup instructions`
- `chore: configure supabase client`

Review the diff before committing and stage only files belonging to the task. Do not include secrets, unrelated user changes, or generated build output. Do not discard existing work, rewrite shared history, or push changes unless authorised.

## 13. AI Agent Working Rules

1. Read applicable `AGENTS.md` instructions and inspect existing code before editing.
2. Check repository status and preserve existing user changes.
3. Follow the user's requested scope. A documentation task does not authorise product implementation.
4. Make incremental changes; do not rewrite working functionality unnecessarily.
5. Reuse existing patterns and dependencies. Avoid speculative architecture and unrelated cleanup.
6. Keep changes limited to relevant files and preserve all required working features.
7. Ask for clarification when a product decision cannot safely be inferred; resolve routine implementation details using existing conventions.
8. Keep secrets private and avoid destructive operations outside the authorised task.
9. Fix TypeScript, lint, and test failures introduced by the changes. Report unrelated failures without silently expanding scope.
10. Run checks appropriate to the change and inspect the final diff.
11. Explain what changed, why, what was verified, and any remaining limitations. Never claim unperformed checks passed.
12. Commit completed work using the conventions above unless the user requests otherwise. Do not publish or push without authorisation.

## 14. Definition of Done

A feature is complete when:

- The requested behaviour works through the relevant UI, API, and persistence boundaries.
- Existing required features remain working.
- Invalid input, empty states, loading states, and errors are handled where applicable.
- Security and access controls match the intended data-access model.
- Affected screens work on mobile, tablet, and desktop and are keyboard accessible.
- Relevant automated tests pass and affected user flows have been checked.
- TypeScript validation, linting, and the production build pass.
- Necessary schema changes and setup instructions are documented without secrets.
- The final diff contains only intended changes.
- The implementation is committed in small, focused Conventional Commits, unless the user requests otherwise.

A UI alone does not establish completion. If a required check is blocked or fails, state what remains incomplete instead of claiming the feature is done.
