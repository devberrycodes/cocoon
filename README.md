# Cocoon

Cocoon is a cozy productivity app for organising tasks, capturing notes, and focusing without unnecessary distraction. Built for HNG Internship Stage 1.

## Features

- Task creation, editing, completion and deletion; priority badges and local due date & time.
- General Notes clipboard with editable sticky notes and persistent colors.
- Task notes and “Also add to clipboard” remain supported by the API; the simplified UI uses descriptions instead.
- Focus Mode with 15/25/45/60-minute timer, pause/reset and manual task completion.
- Compact ambient CD player with seeking and volume. This replaced the earlier Spotify player; no Spotify account or API credentials are needed.
- Background slideshow, collapsible panels, guided first-visit tour and responsive interface.
- Anonymous Supabase sessions and ownership-based RLS for private workspaces.

## Tech stack

Next.js App Router, React, TypeScript, Tailwind/CSS, Supabase Auth and PostgreSQL. No notifications or account screens.

## Local setup and environment variables

Use Node.js 22.6+ (Node 24 recommended for the built-in TypeScript test runner).

```sh
npm ci
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your project's URL and public anon/publishable key. Never use a service-role key. `.env.local` is ignored.

Enable Anonymous Sign-Ins in Supabase Authentication settings. Apply the numbered SQL migrations in `supabase/migrations/` in order, through SQL Editor. The initial task table must already exist, as in this Stage 1 project. Do not run schema changes with the public key.

- `00006` is essential: removes shared policies and enables owner-only access.
- `00007` reuses `tasks.due_date`, conditionally converts date/timestamp to timestamptz, and fixes the initial-task-notes RPC's timestamp handling. Already-timestamptz columns remain unchanged. Old date-only values become UTC midnight; their original intended timezone cannot be inferred.
- Existing unowned tasks/notes remain hidden after `00006`. See `docs/anonymous-auth.md`.
- Same-browser visits reuse the session. Clearing site data or using another browser loses access to that anonymous identity.

## Running the app

```sh
npm run dev
```

Open the address printed by Next.js. For a production check:

```sh
npm run build
npm start
```

## Running tests

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

API tests mock Supabase; session tests cover reuse and isolation. `tests/browser/focus-mode.mjs` checks browser flows against a running app (default port 3015), with Chrome remote debugging on port 9227. Set `COCOON_URL` to override the app address. It mocks API responses and does not modify production data.

Run `supabase/isolation-check.sql` manually after migration to verify actual RLS inside a rolled-back transaction. Automated mocks alone do not prove deployed policies.

## Project structure

- `app/`: pages and authenticated task/note API routes.
- `components/`: workspace, forms, clipboard, focus timer, music and onboarding.
- `lib/`: validation, dates, request-scoped database access and browser auth.
- `types/`: shared domain types; `tests/`: API, timer, session and browser checks.
- `supabase/`: migrations and database verification.

## Assets

- Backgrounds: `public/images/backgrounds/cocoon-bg-01.jpg` through `cocoon-bg-08.jpg`; 1920×1080 recommended. Add/remove paths in `lib/visual-assets.ts` to change the slideshow.
- Clipboard: `public/images/clipboard-texture.jpg`; replace at the same path, or update `clipboardTexture` in `lib/visual-assets.ts`.
- Optional decorations: `public/images/decor/`; configure in `lib/visual-assets.ts`. The plant is intentionally not displayed.
- Music: `public/audio/cocoon-ambient.mp3`; source/title in `lib/audio.ts`. Loads after Play. Keep permission to distribute your supplied assets. A full listen can transfer the entire 43 MB file.

## Deployment

Import the repository into Vercel using the Next.js preset. Select this app directory as the root. Use Node 24, default output settings, `npm ci` for installation and `npm run build` for building. No custom server or static export is needed.

Add both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production and any Preview environment you use, then rebuild. Public variables are embedded at build time. No Spotify variables are required. Apply migrations and enable anonymous auth before sharing the URL.

After deployment verify: two independent browser profiles cannot see each other's records; session survives reload; create/edit/clear local due date & time; complete/uncomplete/delete tasks; note color persistence; Focus start/pause/reset/exit; tour replay; panel collapse; audio playback/seeking; background and clipboard assets; 1440/1024/768/430/390px layouts. The real hosting/audio/RLS checks require the deployed site.

Vercel reference: https://vercel.com/docs/builds

## Live URL

[cocoon](https://fluffy-pasca-12b3ee.netlify.app/)
