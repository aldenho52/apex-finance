# APEX Finance + Health OS — Agent Rules

## Architecture Overview

- **Backend**: FastAPI + Supabase (Postgres) + Plaid + Codex AI
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Auth**: Supabase Auth (JWT) — backend validates via `python-jose`, frontend via `@supabase/supabase-js`
- **DB**: Supabase Postgres with RLS policies on all tables. Schema in `supabase/schema.sql`

## Project Structure

```
backend/
  auth.py              — JWT validation + Supabase client deps
  main.py              — FastAPI app, all routes
  plaid_mod/plaid_client.py — Plaid integration (accounts, transactions, recurring)
  alerts/alert_engine.py    — Payment alert engine + nightly job
  rental/rental_intelligence.py — Rental P&L, market data, sell vs hold
  ai/assistant.py      — Codex-powered chat + daily brief + food classifier
  requirements.txt

frontend/
  src/
    main.tsx           — Router + AuthProvider + ProtectedRoute
    Dashboard.tsx     — Main dashboard (all tabs + chat)
    lib/supabase.ts    — Supabase client init
    lib/api.ts         — Authenticated fetch wrapper + all API functions
    contexts/AuthContext.tsx — Auth state management
    pages/Login.tsx    — Login/signup page
    components/PlaidLink.tsx — Plaid Link bank connection
    index.css          — Tailwind import

supabase/
  schema.sql           — Full Postgres schema (tables, RLS, functions, trigger)
```

---

## Frontend Rules

### Component Architecture
- **Single Responsibility**: Every component does ONE thing. If a component is >150 lines, split it.
- **Reusable Primitives**: Build small, composable components (Button, Card, Badge, ProgressBar, Input) in `src/components/ui/`. Never inline a UI pattern that appears twice.
- **Container/Presentational Split**: Data-fetching logic lives in page-level components or custom hooks. Display components receive data via props only.
- **Custom Hooks for Logic**: Extract shared stateful logic into `src/hooks/` (e.g., `useAccounts`, `useAlerts`, `useCarnivore`). Hooks handle fetch + loading + error states.

### DRY Principles
- **No duplicate API calls**: All API calls go through `src/lib/api.ts`. Never call `fetch()` directly in components.
- **No duplicate styles**: Extract recurring style objects to shared constants or Tailwind utility classes. If you see the same inline style object 3+ times, extract it.
- **No magic numbers**: Use named constants for thresholds, colors, sizes. e.g., `PROTEIN_TARGET = 220`, `FAT_TARGET = 160`.
- **Shared formatters**: Currency formatting, date formatting, percentage formatting — each has ONE utility function in `src/lib/format.ts`.

### State Management
- Auth state: `AuthContext` only. Never re-fetch session in components.
- API data: Fetch in `useEffect` or custom hooks. Use `Promise.allSettled` for parallel loads.
- Clean up: Cancel in-flight requests on unmount. Clear timers and subscriptions.

### TypeScript
- All new files must be `.tsx`/`.ts`. No new `.jsx` files.
- Define interfaces for API response shapes in `src/types/`.
- No `any` types. Use `unknown` + type guards if the shape is uncertain.
- Props interfaces required for all components.

### Error Handling
- Every API call must have error handling (try/catch or `.catch()`).
- Show loading states for all async operations.
- Show empty states when data arrays are empty (never a blank screen).
- Never swallow errors silently — at minimum `console.error` in dev.

### Performance
- Never fetch inside render. Always use `useEffect` or event handlers.
- Memoize expensive computations with `useMemo`.
- Use `useCallback` for functions passed as props to child components.
- Avoid re-renders: don't create new objects/arrays in JSX props.

### Styling
- Use the existing dark theme palette. Never introduce new colors without adding them as constants.
- Font families: `DM Mono` for body, `Syne` for headings/numbers.
- Key colors: `#08090d` (page bg), `#0d0f14` (card bg), `#111827` (borders), `#22c55e` (positive), `#ef4444` (negative/critical), `#f59e0b` (warning), `#60a5fa` (info/accent).

### Security
- No `dangerouslySetInnerHTML`.
- Validate/sanitize user input before sending to API.
- Never store tokens in localStorage — Supabase handles this securely.

---

## Backend Rules

### API Design
- All routes require authentication via `Depends(get_current_user)` except `/health` and `/api/plaid/webhook`.
- User ID always comes from JWT — NEVER from request body or URL params.
- Supabase client comes from `Depends(get_supabase)`.
- Response format: return dicts directly (FastAPI serializes). Use HTTPException for errors.

### Database (Supabase)
- All queries go through `supabase-py` client. No raw SQL in Python code.
- Use `.upsert(doc, on_conflict="column")` for idempotent inserts.
- Use `.rpc("function_name", params)` for complex aggregations (see `schema.sql` functions).
- Always filter by `user_id` in queries — even though RLS provides defense-in-depth.
- Use service_role key in backend (bypasses RLS for admin operations like nightly jobs).

### Code Organization
- `main.py`: Route definitions only. No business logic.
- `plaid_mod/`, `alerts/`, `rental/`, `ai/`: Business logic modules.
- Each module receives `sb: Client` (Supabase client) — never creates its own.
- Shared types/models stay in the module that owns them.

### Error Handling
- Wrap external API calls (Plaid, Rentcast, Zillow, Anthropic) in try/except.
- Log errors with `logger.error()` including context (user_id, endpoint).
- Never expose internal errors to the client. Return generic messages via HTTPException.
- Background tasks (nightly jobs) must catch per-user errors and continue processing other users.

### Security
- Secrets from env vars only. Never hardcode.
- Plaid access tokens should be encrypted at rest (TODO).
- Rate limit Plaid sync endpoints in production.
- Validate all input via Pydantic models.

### Performance
- Use `BackgroundTasks` for long-running operations (syncs, report generation).
- Batch upserts where possible (loop with individual upserts is acceptable for supabase-py).
- The nightly job and monthly report run on APScheduler — don't block the event loop.

---

## Git Rules
- Never include "Generated with Codex" or co-author lines.
- Commit messages: imperative mood, concise, explain the "why".
- Don't commit `.env`, credentials, or large binaries.
