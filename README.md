# Tradable Mobile App (Expo)

## Quick start

1) Install dependencies
```
npm install
```

2) Configure environment variables
- Copy `env.example` to `.env` and fill in the values:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_LIVEKIT_URL`
  - `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID` (for Google Sign-In)

3) Run the app (Expo Go)
```
npm run start
```

Then scan the QR code with Expo Go on iOS or Android.

## Useful commands

- iOS simulator: `npm run ios`
- Android emulator: `npm run android`

## API base URL

- Local dev: `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000`
- Production: replace with your deployed API URL

## Google Sign-In setup

1. **Supabase Dashboard** → Authentication → Providers: Enable Google, add Client ID and Secret from Google Cloud.
2. **Supabase Dashboard** → Authentication → URL Configuration: Add redirect URL `tradable://**`.
3. **Google Cloud Console** → APIs & Services → Credentials: Create OAuth 2.0 Web client. Add authorized redirect URI: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`. Copy Web Client ID to `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID`.
4. For tunnel dev: add `https://[tunnel-id].exp.direct` to Supabase redirect URLs and Google authorized origins.

## Notes

- The mobile app never generates LiveKit tokens. It calls the server endpoint at `/api/livekit/token`.
- Supabase uses the anon key only. Do not put any service role keys in the mobile app.
# Tradable MVP

Tradable connects homeowners with vetted pros for quick remote diagnostics over LiveKit video.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   LIVEKIT_API_KEY=
   LIVEKIT_API_SECRET=
   LIVEKIT_URL=
   ```
   You can copy from `env.example` and rename it to `.env.example`
   if you want a tracked template file.
3. Apply the Supabase schema in `supabase/schema.sql` (SQL editor or migration).
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Supabase notes

- RLS is enabled on all tables. Server routes use the service role key for
  write operations after verifying the authenticated user.
- Users sign in with magic links (`/login`).

## Seed data (pro profile)

Create a pro profile for a user (replace `USER_ID` with the auth user UUID):

```sql
insert into pro_profiles (user_id, trade, service_radius_miles, min_consult_price, availability_text)
values ('USER_ID', 'plumber', 25, 99, 'Weekdays 9am-5pm');
```
