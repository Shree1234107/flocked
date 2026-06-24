# Flocked — Claude Code Build Script

You are building **Flocked**: a Gen Z social app where pre-vetted Hosts run live
community video rooms around shared interests, and Guests browse a feed and tap
in to join. Built on top of the Tradable codebase (Expo + Express + Supabase +
LiveKit). No payments in v1.

Work through the tasks below in order. After every task, confirm it runs/compiles
before moving on. Never break the architecture rules in `CLAUDE.md`.

---

## 0. Rename & rebrand

- [ ] In `app.json`, set `name` → `"Flocked"`, `slug` → `"flocked"`,
      `scheme` → `"flocked"`.
- [ ] In `app/_layout.tsx`, replace the green Tradable theme with Flocked's palette:
  ```
  primary:           "#6C3CE1"   (electric violet)
  primaryContainer:  "#EDE9FB"
  secondary:         "#F97316"   (vivid orange accent)
  secondaryContainer:"#FFF0E6"
  background:        "#0D0D0D"   (near-black)
  surface:           "#1A1A1A"
  surfaceVariant:    "#242424"
  onPrimary:         "#FFFFFF"
  outline:           "#2E2E2E"
  ```
- [ ] Remove `<StripeProvider>` wrapper — no payments in v1.
- [ ] Rename `ROLE_KEY` in `lib/role.tsx` from `"tradable.role"` → `"flocked.role"`.
- [ ] Replace all remaining "Tradable" strings in UI copy with "Flocked".

---

## 1. Rename roles

Tradable used `customer` / `pro`. Flocked uses `guest` / `host`.

- [ ] In `lib/role.tsx`: update `Role` type → `"guest" | "host"`.
- [ ] In `lib/types.ts`: update any role references.
- [ ] In `backend/src/index.ts`:
  - Update `requireUserRole` calls: `"customer"` → `"guest"`, `"pro"` → `"host"`.
  - Update `user_profiles` check constraint:
    `role in ('customer', 'pro')` → `role in ('guest', 'host')`.
- [ ] In `supabase/schema.sql`:
  - Update `user_profiles` check constraint to `('guest', 'host')`.
  - Run via Supabase dashboard:
    ```sql
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('guest', 'host'));
    ```
- [ ] Rename all route folders:
  - `app/customer/` → `app/guest/`
  - `app/pro/` → `app/host/`
  - Update all internal imports to match.
- [ ] Update `app/index.tsx` redirect logic:
  - `role === "pro"` → `role === "host"`, redirect to `/host`
  - `role === "customer"` → `role === "guest"`, redirect to `/guest`

---

## 2. Redesign the database schema for Rooms

Replace the `requests` + `outcomes` tables with a `rooms` table. Keep
`user_profiles` and `pro_profiles` (rename to `host_profiles`).

### 2a. New tables (add to `supabase/schema.sql`)

```sql
-- Rename pro_profiles to host_profiles
ALTER TABLE pro_profiles RENAME TO host_profiles;

-- Rooms: a live video session created by a host
CREATE TABLE IF NOT EXISTS rooms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        uuid NOT NULL REFERENCES auth.users(id),
  title          text NOT NULL,
  description    text,
  interest_tag   text NOT NULL,   -- e.g. "birding", "gaming", "cooking"
  status         text NOT NULL DEFAULT 'live'
                   CHECK (status IN ('live', 'ended')),
  participant_count integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz
);

-- Room participants: tracks who is in a room right now
CREATE TABLE IF NOT EXISTS room_participants (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read rooms
CREATE POLICY "rooms: authenticated read" ON rooms
  FOR SELECT TO authenticated USING (true);

-- Only the host can insert their own room
CREATE POLICY "rooms: host insert" ON rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

-- Only the host can update/end their own room
CREATE POLICY "rooms: host update" ON rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- Participants: authenticated read/write (backend enforces join rules)
CREATE POLICY "room_participants: authenticated all" ON room_participants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 2b. Update `lib/types.ts`

Replace `Request`, `OutcomePayload`, `Outcome` types with:

```typescript
export type RoomStatus = "live" | "ended";

export type Room = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  interest_tag: string;
  status: RoomStatus;
  participant_count: number;
  created_at: string;
  ended_at: string | null;
  host?: HostProfile;   // joined on read
};

export type HostProfile = {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  photo_url: string | null;
  bio: string | null;
  interest_tags: string[];   // array of tags this host covers
  is_approved: boolean;
  created_at: string;
};
```

---

## 3. Backend — replace Tradable routes with Flocked routes

In `backend/src/index.ts`, remove all Tradable-specific routes
(`/api/requests`, `/api/outcomes`, `/api/stripe/*`, `/api/cal/*`,
`/api/pros`, `/api/customer/calls`) and add the following Flocked routes.
Keep auth middleware, `requireAuth`, `requireUserRole`, LiveKit token route, and
the `/api/auth/role` + `/api/pro/profile` routes (renaming "pro" → "host").

### Rooms

```
POST   /api/rooms            — host creates a live room
GET    /api/rooms            — list all live rooms (optional ?tag= filter)
GET    /api/rooms/:id        — get single room with host profile
PATCH  /api/rooms/:id/end   — host ends their room (sets status=ended, ended_at=now)
```

**POST /api/rooms** (host only)
- Zod schema: `{ title: string, description?: string, interestTag: string }`
- Insert into `rooms` with `host_id = userId`, `status = 'live'`
- Create a LiveKit room via LiveKit server SDK (`roomService.createRoom`)
  using the room `id` as the LiveKit room name
- Return the new `Room` record

**GET /api/rooms**
- Query: `SELECT rooms.*, host_profiles.* FROM rooms JOIN host_profiles ...`
  WHERE `status = 'live'`, optional `interest_tag` filter
- Order by `participant_count DESC, created_at DESC`
- Return array of rooms with nested host profile

**GET /api/rooms/:id**
- Fetch single room + host profile join
- Return `Room` with `host` field populated

**PATCH /api/rooms/:id/end** (host only, `requireUserRole(["host"])`)
- Verify `host_id = userId`
- Set `status = 'ended'`, `ended_at = now()`
- Delete from `room_participants` where `room_id = id`
- Optionally delete the LiveKit room via `roomService.deleteRoom(id)`
- Return updated room

### Participants

```
POST   /api/rooms/:id/join   — guest joins a room (upsert participant, bump count)
POST   /api/rooms/:id/leave  — guest/host leaves (remove participant, decrement count)
```

**POST /api/rooms/:id/join**
- Upsert into `room_participants (room_id, user_id)`
- Increment `rooms.participant_count` by 1
- Return `{ ok: true }`

**POST /api/rooms/:id/leave**
- Delete from `room_participants` where `room_id = id AND user_id = userId`
- Decrement `rooms.participant_count` by 1 (floor at 0)
- Return `{ ok: true }`

### Host profile (rename from pro profile)

Keep all existing `/api/pro/profile` routes but rename to `/api/host/profile`.
Add two new fields in the Zod schema and DB columns:
- `bio: string` (short host bio)
- `interestTags: string[]` (stored as comma-separated text in `host_profiles.interest_tags`)
- `isApproved: boolean` (backend-only; default false; set manually via Supabase dashboard for now)

### Host approval (admin only — stub for now)

```
PATCH  /api/admin/hosts/:userId/approve  — set is_approved = true
```
- Require a static `ADMIN_SECRET` header matching `process.env.ADMIN_SECRET`
- This is a stub — no real admin UI in v1

---

## 4. Update `lib/api.ts`

Remove all Tradable API functions (requests, outcomes, stripe, cal, pros).
Replace with Flocked functions:

```typescript
// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom(params: {
  title: string;
  description?: string;
  interestTag: string;
}): Promise<Room> { ... }

export async function listRooms(tag?: string): Promise<Room[]> { ... }

export async function getRoom(id: string): Promise<Room> { ... }

export async function endRoom(id: string): Promise<Room> { ... }

export async function joinRoom(id: string): Promise<void> { ... }

export async function leaveRoom(id: string): Promise<void> { ... }

// ─── Host profile ──────────────────────────────────────────────────────────────

export async function getHostProfile(): Promise<HostProfile | null> { ... }

export async function saveHostProfile(params: {
  displayName: string;
  bio: string;
  interestTags: string[];
  photoUrl?: string;
}): Promise<HostProfile> { ... }
```

Keep `getLiveKitToken`, `getUserRole`, `setUserRole`, `uploadAvatar`.

---

## 5. Guest screens

### `app/guest/(tabs)/_layout.tsx`
Three tabs: **Discover** (home icon), **My Rooms** (history icon), **Profile** (person icon).

### `app/guest/(tabs)/index.tsx` — Discover Feed

This is the main screen. Gen Z energy: dark background, big cards, bold type.

Layout:
```
┌─────────────────────────────────────┐
│  🐦 Flocked          [search icon]  │  ← header
├─────────────────────────────────────┤
│  [All] [birding] [gaming] [cooking] │  ← horizontal tag filter chips
│  [music] [art] [fitness] [travel]   │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  🟢 LIVE  3 watching         │  │  ← RoomCard (large, full-width)
│  │  "Rare Bird Alert: Snowy Owl" │  │
│  │  @birder_kai · birding        │  │
│  │  [avatar]                     │  │
│  └───────────────────────────────┘  │
│  (more cards...)                    │
└─────────────────────────────────────┘
```

Implementation notes:
- `FlatList` of `RoomCard` components
- Pull-to-refresh calls `listRooms(selectedTag)`
- Poll every 15 seconds to update participant counts (simple `setInterval`)
- Tag chips: `["All", "birding", "gaming", "cooking", "music", "art", "fitness", "travel", "beauty", "tech"]`
- Tapping a card navigates to `app/room/[id].tsx` (join flow)

**RoomCard component** (`components/RoomCard.tsx`):
- Dark card (`#1A1A1A` bg, `#2E2E2E` border, 16px radius)
- Top-left: `🟢 LIVE` badge (green dot + "LIVE" in bold violet)
- Top-right: participant count + 👁 icon
- Middle: room title (bold, 18px, white)
- Bottom row: host avatar (32px circle) + `@displayName` + tag pill

### `app/guest/(tabs)/history.tsx` — My Rooms

Simple list of rooms the user has joined (query `room_participants` joined
to `rooms` for the current user). Show ended rooms too with a grey "ENDED" badge.

### `app/guest/(tabs)/profile.tsx` — Guest Profile

- Show email, avatar (placeholder initials if no photo)
- "Switch to Host" button (navigates to host setup/approval flow)
- Sign out button

---

## 6. Host screens

### `app/host/(tabs)/_layout.tsx`
Three tabs: **My Room** (video icon), **Activity** (chart icon), **Profile** (person icon).

### `app/host/(tabs)/index.tsx` — Host Dashboard

Layout:
```
┌─────────────────────────────────────┐
│  🐦 Flocked Host                    │
├─────────────────────────────────────┤
│  [if no live room]                  │
│    ┌─────────────────────────────┐  │
│    │  Go Live                    │  │
│    │  [Title input]              │  │
│    │  [Description input]        │  │
│    │  [Tag picker]               │  │
│    │  [🔴 Start Room  button]    │  │
│    └─────────────────────────────┘  │
│  [if room is live]                  │
│    ┌─────────────────────────────┐  │
│    │  🟢 You're LIVE             │  │
│    │  "Rare Bird Alert..."       │  │
│    │  👁 12 watching             │  │
│    │  [Join My Room]  [End Room] │  │
│    └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

Implementation notes:
- On mount, fetch rooms where `host_id = currentUser.id AND status = 'live'`
- If a live room exists, show the "live" state card
- "Start Room" calls `createRoom()` then navigates to `app/room/[id].tsx`
- "Join My Room" navigates to `app/room/[id].tsx`
- "End Room" calls `endRoom(id)`, resets state to the form

### `app/host/(tabs)/activity.tsx` — Past Rooms

List of the host's rooms (all statuses), ordered by `created_at DESC`.
Show title, tag, date, peak participant count.

### `app/host/(tabs)/profile.tsx` — Host Profile

- Edit display name, bio, interest tags, avatar
- Show approval status badge: `✅ Approved` or `⏳ Pending Approval`
- Save calls `saveHostProfile()`

---

## 7. Room screen (shared)

### `app/room/[id].tsx`

This is the core LiveKit video room. Adapt `app/call/[id].tsx` with these changes:

**On enter:**
1. Fetch room details via `getRoom(id)`
2. If `room.status === 'ended'` → show "This room has ended" screen, back button
3. Call `joinRoom(id)` (updates participant count)
4. Fetch LiveKit token via `getLiveKitToken(id)`
5. Connect to LiveKit room

**Layout:**
```
┌─────────────────────────────────────┐
│  [← back]   "Room Title"   👁 12   │  ← top bar (translucent overlay)
├─────────────────────────────────────┤
│                                     │
│         VIDEO GRID (flex: 1)        │
│   (host video large, guests small)  │
│                                     │
├─────────────────────────────────────┤
│  [🎤 Mute]  [📷 Camera]  [Leave]   │  ← controls
└─────────────────────────────────────┘
```

**Camera toggle:** add a camera on/off button alongside mute
  (call `room.localParticipant.setCameraEnabled(bool)`)

**Video grid layout:**
- If 1 participant: full screen
- If 2: split 50/50 vertical
- If 3+: CSS grid 2-column wrap

**On leave:**
- Call `leaveRoom(id)`
- If `role === 'host'`, ask: "End room for everyone?" → Yes calls `endRoom(id)`
- Navigate back to the appropriate tab home

**Participant count:** poll `getRoom(id)` every 10 seconds and update the count
in the top bar.

---

## 8. Login & onboarding

### `app/login.tsx`

Replace Tradable's login with a Flocked-branded screen:
- Dark background (`#0D0D0D`)
- Large "🐦 Flocked" wordmark (white, bold, 36px)
- Tagline: "Live rooms for the things you love."
- Two buttons: **Join as Guest** → `/login/guest`, **Go Live as Host** → `/login/host`
- Both use Supabase magic link (keep existing auth helper logic)

### Host approval gate

In `app/host/_layout.tsx`, after role check, also check `host_profile.is_approved`.
If `!is_approved`:
- Show a friendly "You're on the waitlist 🎉" screen
- Text: "Your host application is under review. We'll notify you when you're approved."
- Show profile preview so they can fill out their bio while waiting

---

## 9. Interests & tags

Add a `INTEREST_TAGS` constant (shared between frontend and backend):

```typescript
// lib/config.ts
export const INTEREST_TAGS = [
  "birding", "gaming", "cooking", "music",
  "art", "fitness", "travel", "beauty",
  "tech", "nature", "sports", "books",
] as const;

export type InterestTag = typeof INTEREST_TAGS[number];
```

Use this list everywhere: tag filter chips on Discover, tag picker on Go Live
form, host profile interest tags, backend Zod validation.

---

## 10. Polish & consistency

- [ ] All screens use dark background `#0D0D0D` / `#1A1A1A` surface
- [ ] Primary action buttons use `#6C3CE1` (violet), destructive use `#EF4444`
- [ ] "LIVE" badge: green dot (`#22C55E`) + "LIVE" text in semibold white/violet
- [ ] Loading states: use `ActivityIndicator` with `color="#6C3CE1"`
- [ ] Empty states: friendly emoji + short copy (e.g. "No live rooms right now 🐦\nCheck back soon!")
- [ ] All API errors shown via `Alert.alert("Oops", errorMessage)`
- [ ] Remove all Stripe imports from frontend
- [ ] Remove `app/media-test.tsx` (dev artifact)
- [ ] Update `CLAUDE.md` to reflect Flocked's architecture

---

## 11. Environment variables

### Mobile (`.env`)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_LIVEKIT_URL=
```
*(Remove `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `EXPO_PUBLIC_APPLE_MERCHANT_ID`)*

### Backend (`.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=
ADMIN_SECRET=          # for /api/admin/hosts/:id/approve
```
*(Remove `STRIPE_SECRET_KEY`, `CAL_API_KEY`)*

---

## Architecture rules (unchanged from Tradable)

1. **Mobile never writes to Supabase directly.** All DB mutations go through Express.
2. **LiveKit tokens are always server-issued.** Never generate in mobile code.
3. **`requireAuth` on every protected route.** `requireUserRole` for role-gated routes.
4. **Role source of truth: SecureStore + user_profiles.** Key: `flocked.role`.
5. **TypeScript everywhere.** Zod for all backend input validation.
6. **No inline styles.** `StyleSheet.create()` only.
7. **`apiFetch` / `request()` for all API calls.** Never raw `fetch` in screens.

---

## Task order summary

1. Rebrand (colors, name, remove Stripe)
2. Rename roles (customer→guest, pro→host)
3. DB schema (rooms, room_participants, rename host_profiles)
4. Backend routes (rooms CRUD, join/leave, host profile)
5. `lib/api.ts` update
6. Guest screens (Discover feed, History, Profile)
7. Host screens (Dashboard, Activity, Profile)
8. Room screen (adapted from call screen)
9. Login & approval gate
10. Tags constant
11. Polish pass
12. Env var cleanup
