-- Flocked schema

-- User profiles: role is set at signup and never changes
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id   uuid PRIMARY KEY,
  role      text NOT NULL CHECK (role IN ('guest', 'host')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Host profiles: created during onboarding, one per host user
CREATE TABLE IF NOT EXISTS host_profiles (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name   text,
  full_name      text,
  photo_url      text,
  bio            text,
  interest_tags  text NOT NULL DEFAULT '',  -- comma-separated list
  is_approved    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Rooms: a live video session created by a host
CREATE TABLE IF NOT EXISTS rooms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id           uuid NOT NULL REFERENCES auth.users(id),
  title             text NOT NULL,
  description       text,
  interest_tag      text NOT NULL,
  status            text NOT NULL DEFAULT 'live'
                      CHECK (status IN ('live', 'ended')),
  participant_count integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz
);

-- Room participants: tracks who is in a room right now
CREATE TABLE IF NOT EXISTS room_participants (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Note: the Express backend uses the service role key and bypasses RLS.
-- These policies protect direct Supabase client access (defense in depth).

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only read/write their own row
CREATE POLICY "user_profiles: owner access" ON user_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- host_profiles: any authenticated user can read
CREATE POLICY "host_profiles: authenticated read" ON host_profiles
  FOR SELECT TO authenticated USING (true);

-- host_profiles: only the owner can insert/update their own profile
CREATE POLICY "host_profiles: owner write" ON host_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- rooms: any authenticated user can read live rooms
CREATE POLICY "rooms: authenticated read" ON rooms
  FOR SELECT TO authenticated USING (true);

-- rooms: only the host can create their own room
CREATE POLICY "rooms: host insert" ON rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

-- rooms: only the host can update/end their own room
CREATE POLICY "rooms: host update" ON rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- room_participants: authenticated read/write (backend enforces join rules)
CREATE POLICY "room_participants: authenticated all" ON room_participants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Storage ─────────────────────────────────────────────────────────────────
-- Run once in Supabase dashboard → Storage → New bucket:
--   Name: avatars, Public: true
-- Then add this RLS policy in Storage → Policies:
--   INSERT/UPDATE: (auth.uid()::text) = (storage.foldername(name))[1]

-- Instructor applications: one per host user, tracks questionnaire answers
CREATE TABLE IF NOT EXISTS instructor_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  what_to_teach  text NOT NULL,
  why_teach      text NOT NULL,
  qualifications text NOT NULL,
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;

-- Instructors can only read their own application
CREATE POLICY "instructor_applications: owner read" ON instructor_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Backend (service role) handles all writes

-- Scheduled classes: future sessions created by instructors
CREATE TABLE IF NOT EXISTS scheduled_classes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          uuid NOT NULL REFERENCES auth.users(id),
  title            text NOT NULL,
  category         text NOT NULL CHECK (category IN ('Yoga', 'Dance', 'Tutoring')),
  scheduled_at     timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes IN (30, 45, 60, 90)),
  max_students     integer NOT NULL CHECK (max_students BETWEEN 1 AND 50),
  current_students integer NOT NULL DEFAULT 0,
  description      text,
  status           text NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_classes: authenticated read" ON scheduled_classes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "scheduled_classes: host insert" ON scheduled_classes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "scheduled_classes: host update" ON scheduled_classes
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- Class enrollments: tracks which students have joined which class
CREATE TABLE IF NOT EXISTS class_enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id)
);

ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_enrollments: authenticated all" ON class_enrollments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Class reviews: students rate a class after it ends
CREATE TABLE IF NOT EXISTS class_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id),
  instructor_id uuid NOT NULL REFERENCES auth.users(id),
  rating        integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

ALTER TABLE class_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_reviews: authenticated read" ON class_reviews
  FOR SELECT TO authenticated USING (true);

-- Backend (service role) handles all writes to class_reviews

-- Class waitlist: queue for full classes
CREATE TABLE IF NOT EXISTS class_waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id)
);

ALTER TABLE class_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_waitlist: authenticated all" ON class_waitlist
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Migrations (run against existing deployments) ────────────────────────────
-- ALTER TABLE pro_profiles RENAME TO host_profiles;
-- ALTER TABLE host_profiles ADD COLUMN IF NOT EXISTS bio text;
-- ALTER TABLE host_profiles ADD COLUMN IF NOT EXISTS interest_tags text NOT NULL DEFAULT '';
-- ALTER TABLE host_profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;
-- ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('guest', 'host'));

-- Add editable profile fields to user_profiles (student profiles)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS photo_url text;

-- User follows: tracks which guests follow which hosts
CREATE TABLE IF NOT EXISTS user_follows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, host_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_follows: users manage own follows" ON user_follows
  FOR ALL TO authenticated
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user_follows: read follower counts" ON user_follows
  FOR SELECT TO authenticated USING (true);
