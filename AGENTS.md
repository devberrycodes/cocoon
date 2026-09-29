# AGENTS.md

## Project

Focus Room is a productivity-focused To-Do application built for HNG Internship Stage 1.

The application must support:

- Task creation
- Task viewing
- Task editing
- Task deletion
- Task completion
- Notes
- Priority levels
- Due dates
- Focus Mode
- Spotify playlist integration

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL

## Code Quality

- Use TypeScript throughout the application.
- Avoid using `any` unless absolutely necessary.
- Write reusable components.
- Keep components small and focused.
- Use descriptive function and variable names.
- Avoid duplicated logic.
- Keep business logic separate from presentation logic.

## Frontend

- Use responsive layouts.
- Components must work on mobile and desktop.
- Follow the application's visual system consistently.
- Use reusable UI components where possible.
- Provide loading, error, empty and success states.

## Backend

- Validate all API input.
- Return appropriate HTTP status codes.
- Handle errors gracefully.
- Never expose sensitive credentials to the client.
- Store secrets in environment variables.

## Database

- Keep database access separated from UI components.
- Use clear database table and column names.
- Avoid destructive database operations without confirmation.

## Testing

- Write tests for every API endpoint created.
- Test successful requests.
- Test invalid input.
- Test missing resources.
- Test update operations.
- Test delete operations.
- Run tests after changing backend functionality.

## Security

- Never commit `.env` files.
- Never expose private API keys.
- Validate authentication where required.
- Keep Spotify secrets server-side.

## AI Development Rules

- Make changes incrementally.
- Do not rewrite working areas unnecessarily.
- Explain significant architectural changes.
- Run linting and tests after major changes.
- Fix errors before moving to the next feature.