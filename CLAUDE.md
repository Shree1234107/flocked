# Flocked — Claude Code Instructions

## What this app is
Flocked is a Gen Z social app where pre-vetted Hosts run live community video rooms and Guests browse a feed and join. No payments in v1. Video calls are powered by LiveKit; auth and data are backed by Supabase + Express.

## Running the project

```bash
# Mobile (from repo root)
npx expo start

# Backend (from repo root)
cd backend && npm run dev

# Both are required for the app to function
```

## Architecture rules — never break these

1. **Mobile never writes to Supabase directly.** All DB mutations go through the Express backend (`backend/src/index.ts`). Mobile uses Supabase only for auth session management and read-only queries.
2. **LiveKit tokens are always server-issued.** Never generate a LiveKit token in mobile code. Always call `POST /api/livekit/token`.
3. **No secret keys on mobile.** `LIVEKIT_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SECRET` must never appear in mobile code or env vars prefixed with `EXPO_PUBLIC_`.
4. **Backend validates auth on every protected route.** Use the `requireAuth` middleware (validates Bearer JWT via `supabase.auth.getUser()`). Use `requireUserRole(["guest"|"host"])` for role-gated routes.
5. **Role source of truth is SecureStore + user_profiles.** Mobile reads role from SecureStore (`flocked.role`). Backend reads from `user_profiles` table. Keep these in sync on login.

## Key file map

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | All Express API routes (single file) |
| `lib/api.ts` | All mobile → backend API calls |
| `lib/auth.tsx` | AuthProvider + useAuth hook (Supabase session) |
| `lib/role.tsx` | RoleProvider + useRole hook (SecureStore-backed, key: `flocked.role`) |
| `lib/types.ts` | Shared TypeScript types (Room, HostProfile) |
| `lib/config.ts` | INTEREST_TAGS constant (shared between frontend logic and backend Zod) |
| `supabase/schema.sql` | DB schema (run migrations manually via Supabase dashboard) |
| `app/_layout.tsx` | Root provider stack |
| `app/index.tsx` | Auth + role → redirect logic |

## Roles

- `guest` — browses the Discover feed, joins rooms
- `host` — creates and runs live rooms; must be approved (`host_profiles.is_approved = true`) before the tab navigator is shown

## Adding a new API route

1. Add the route handler in `backend/src/index.ts`
2. Add a Zod schema for the request body
3. Use `requireAuth` (and `requireUserRole` if role-gated)
4. Add a corresponding function in `lib/api.ts` on the mobile side
5. Use `apiFetch()` — it handles auth headers and base URL automatically

## Adding a new screen

1. Create the file under `app/guest/` or `app/host/` following expo-router file conventions
2. Wrap content in `<AuthGate>` + `<RoleGuard requiredRole="guest"|"host">`
3. Guest screens: protected by `app/guest/_layout.tsx`
4. Host screens: protected by `app/host/_layout.tsx` (also checks `is_approved`)
5. Shared screens (e.g. the room): live under `app/room/`

## Database changes

- Edit `supabase/schema.sql` to reflect the new state
- Apply the change manually via Supabase dashboard SQL editor or `supabase db push`
- Update `lib/types.ts` to match any added/removed columns
- Update affected routes in `backend/src/index.ts`

## Code conventions

- **TypeScript everywhere.** No `any` unless absolutely necessary — prefer `unknown` and narrow.
- **Zod for all external input.** Validate every request body in the backend with a Zod schema before touching the DB.
- **No inline styles.** Use `StyleSheet.create()` in React Native screens.
- **react-native-paper components** for UI (Button, TextInput, ActivityIndicator, etc.). Match the dark Flocked color scheme (`#6C3CE1` primary, `#0D0D0D` background, `#1A1A1A` surface).
- **`apiFetch` for all API calls.** Never use raw `fetch` in screens — always go through `lib/api.ts`.
- **Error handling:** Show user-facing errors via `Alert.alert("Oops", errorMessage)`. Never swallow errors silently.

## DB schema facts (avoid mistakes)

- `rooms.host_id` is a UUID FK to `auth.users`
- `rooms.status` lifecycle: `live` → `ended`
- `rooms.participant_count` is maintained by recount on join/leave (not increment/decrement)
- `room_participants.room_id` FK to `rooms.id`; `user_id` FK to `auth.users`
- `host_profiles.is_approved` defaults to `false`; set to `true` via `PATCH /api/admin/hosts/:userId/approve`
- `host_profiles.interest_tags` stored as comma-separated text; converted to `string[]` on read

## Environment variables

**Mobile** (prefix all with `EXPO_PUBLIC_`): `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LIVEKIT_URL`

**Backend only** (never expose to mobile): `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `ADMIN_SECRET`

## Interest tags

Defined in `lib/config.ts` as `INTEREST_TAGS` (const tuple) and mirrored in `backend/src/index.ts`. Used everywhere: Discover filter chips, Go Live tag picker, Host Profile editor, and backend Zod validation.

## What not to do

- Don't add new dependencies without checking if existing ones already cover the use case
- Don't modify RLS policies without understanding the full access pattern — wrong RLS = data leak or broken app
- Don't create new Supabase clients in components; use the singleton in `lib/supabase.ts`
- Don't store sensitive data (tokens, keys) in AsyncStorage; use SecureStore
- Don't add loading spinners or optimistic UI unless the existing patterns already use them — stay consistent
