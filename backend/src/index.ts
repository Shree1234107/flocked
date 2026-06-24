import "dotenv/config";

import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import nodemailer from "nodemailer";
import { z } from "zod";

// ─── Env validation ───────────────────────────────────────────────────────────

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`FATAL: Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const livekitUrl = process.env.LIVEKIT_URL!;
const livekitApiKey = process.env.LIVEKIT_API_KEY!;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET!;
const adminSecret = process.env.ADMIN_SECRET ?? "";

// ─── Shared constants ─────────────────────────────────────────────────────────

const INTEREST_TAGS = [
  "Yoga", "Tutoring", "Dance",
] as const;
type InterestTag = typeof INTEREST_TAGS[number];

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/(?:10|192\.168)\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
        /\.railway\.app$/.test(origin) ||
        /\.up\.railway\.app$/.test(origin);
      allowed
        ? callback(null, true)
        : callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

// ─── External clients ─────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret);

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthedRequest = express.Request & { userId: string; userEmail: string; userRole?: string };

// ─── Response helpers ─────────────────────────────────────────────────────────

const ok = <T>(res: express.Response, data: T, status = 200) =>
  res.status(status).json({ ok: true, data });

const fail = (res: express.Response, message: string, status = 400) =>
  res.status(status).json({ ok: false, message });

const zodMessage = (e: z.ZodError) =>
  e.issues[0]?.message ?? "Invalid request.";

// ─── Auth middleware ──────────────────────────────────────────────────────────

const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return fail(res, "You must be signed in to do this.", 401);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return fail(res, "Your session has expired. Please sign in again.", 401);

  (req as AuthedRequest).userId = user.id;
  (req as AuthedRequest).userEmail = user.email ?? "";
  next();
};

// ─── Role middleware ──────────────────────────────────────────────────────────

const requireUserRole = (allowed: string[]) => async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return fail(res, "Your account type could not be verified. Please sign in again.", 403);
  }

  if (!allowed.includes(data.role)) {
    return fail(res, "You don't have permission to do this.", 403);
  }

  (req as AuthedRequest).userRole = data.role;
  next();
};

// ─── Auth callback (magic link / OAuth redirect) ──────────────────────────────
//
// Supabase is configured to redirect to this endpoint after email magic links
// and OAuth flows. We forward the tokens into the app via the flocked:// scheme.
//
// Supabase appends tokens as a URL fragment (#access_token=...) which browsers
// never send to the server. A small HTML page reads the fragment client-side and
// then performs the redirect to the deep link so the mobile app receives the
// tokens either way.

app.get("/auth/callback", (req, res) => {
  const { access_token, refresh_token, type, code, error, error_description } = req.query as Record<string, string>;

  if (error) {
    return res.status(400).send(`Auth error: ${error_description ?? error}`);
  }

  // Build the deep link server-side — code/token are already in req.query.
  // Inject directly into the HTML so window.location.href fires in <head>
  // before the body renders, with a visible button as tap fallback.
  let deepLink: string | null = null;
  if (code) {
    deepLink = `exp+flocked://auth/callback?code=${encodeURIComponent(code)}`;
  } else if (access_token) {
    const p = new URLSearchParams({ access_token, type: type ?? "magiclink" });
    if (refresh_token) p.set("refresh_token", refresh_token);
    deepLink = `exp+flocked://auth/callback?${p.toString()}`;
  }

  const deepLinkJson = JSON.stringify(deepLink);
  const btnHtml = deepLink
    ? `<a href="${deepLink}">Open Flocked</a>`
    : `<p style="color:#c00">Sign-in link expired or already used. Please request a new one.</p>`;

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening Flocked…</title>
  <script>
    var deepLink = ${deepLinkJson};
    if (deepLink) { window.location.href = deepLink; }
  </script>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh; margin: 0;
           background: #f9f9f9; color: #2c2c2c; text-align: center; padding: 24px; box-sizing: border-box; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p  { font-size: 15px; color: #666; margin-bottom: 28px; }
    a  { display: inline-block; background: #87A878; color: #fff; font-size: 16px;
         font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; }
  </style>
</head>
<body>
  <h1>You're almost in!</h1>
  <p>If Flocked doesn't open automatically, tap below.</p>
  ${btnHtml}
</body>
</html>`);
});

// ─── Auth/role routes ─────────────────────────────────────────────────────────

app.get("/api/auth/role", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/auth/role]", error.message);
    return fail(res, "Failed to load account type.", 500);
  }

  if (!data) return fail(res, "No account type set.", 404);

  return ok(res, { role: data.role });
});

app.post("/api/auth/role", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { role } = req.body;

  if (role !== "guest" && role !== "host") {
    return fail(res, "Invalid role.");
  }

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return ok(res, { role: existing.role });
  }

  const { error } = await supabase
    .from("user_profiles")
    .insert({ user_id: userId, role });

  if (error) {
    console.error("[POST /api/auth/role]", error.message);
    return fail(res, "Failed to set account type.", 500);
  }

  return ok(res, { role }, 201);
});

// ─── Student profile routes ───────────────────────────────────────────────────

const studentProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(50),
  photoUrl: z.string().url().nullable().optional(),
});

app.get("/api/profile", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const userEmail = (req as AuthedRequest).userEmail;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/profile]", error.message);
    return fail(res, "Failed to load profile.", 500);
  }

  const row = data as Record<string, unknown> | null;
  return ok(res, {
    user_id: userId,
    email: userEmail,
    display_name: (row?.display_name as string | null) ?? null,
    photo_url: (row?.photo_url as string | null) ?? null,
  });
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const parsed = studentProfileSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { displayName, photoUrl } = parsed.data;

  const { error } = await supabase
    .from("user_profiles")
    .update({
      display_name: displayName,
      ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[PUT /api/profile]", error.message);
    return fail(res, "Failed to update profile.", 500);
  }

  return ok(res, { displayName, photoUrl: photoUrl ?? null });
});

// ─── LiveKit routes ───────────────────────────────────────────────────────────

app.post("/api/livekit/token", requireAuth, async (req, res) => {
  const { roomId } = req.body ?? {};
  if (!roomId || typeof roomId !== "string") {
    return fail(res, "roomId is required.");
  }

  const userId = (req as AuthedRequest).userId;
  const identity = `user-${userId}`;

  const token = new AccessToken(livekitApiKey, livekitApiSecret, { identity });
  token.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true });

  const jwt = await token.toJwt();
  return ok(res, { token: jwt });
});

// ─── Avatar upload ────────────────────────────────────────────────────────────

app.patch("/api/host/profile/photo", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { photoUrl } = req.body ?? {};
  if (!photoUrl || typeof photoUrl !== "string") {
    return fail(res, "photoUrl is required.");
  }

  const { error } = await supabase
    .from("host_profiles")
    .update({ photo_url: photoUrl })
    .eq("user_id", userId);

  if (error) {
    console.error("[PATCH /api/host/profile/photo]", error.message);
    return fail(res, "Failed to update photo.", 500);
  }

  return ok(res, { photoUrl });
});

// ─── Host profile routes ──────────────────────────────────────────────────────

const hostProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  bio: z.string().max(500).default(""),
  interestTags: z.array(z.enum(INTEREST_TAGS)).max(INTEREST_TAGS.length).default([]),
  photoUrl: z.string().url().optional(),
});

app.get("/api/host/profile", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("host_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/host/profile]", error.message);
    return fail(res, "Failed to load profile.", 500);
  }

  if (!data) return fail(res, "Profile not found.", 404);

  return ok(res, {
    ...data,
    interest_tags: data.interest_tags ? data.interest_tags.split(",").filter(Boolean) : [],
  });
});

app.post("/api/host/profile", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const parsed = hostProfileSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { displayName, bio, interestTags, photoUrl } = parsed.data;

  const profileData = {
    user_id: userId,
    display_name: displayName,
    bio,
    interest_tags: interestTags.join(","),
    ...(photoUrl ? { photo_url: photoUrl } : {}),
  };

  const { data, error } = await supabase
    .from("host_profiles")
    .upsert(profileData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/host/profile]", error.message);
    return fail(res, "Failed to save profile.", 500);
  }

  return ok(res, {
    ...data,
    interest_tags: data.interest_tags ? data.interest_tags.split(",").filter(Boolean) : [],
  });
});

app.put("/api/host/profile", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const parsed = hostProfileSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { displayName, bio, interestTags, photoUrl } = parsed.data;

  const profileData = {
    user_id: userId,
    display_name: displayName,
    bio,
    interest_tags: interestTags.join(","),
    ...(photoUrl ? { photo_url: photoUrl } : {}),
  };

  const { data, error } = await supabase
    .from("host_profiles")
    .upsert(profileData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[PUT /api/host/profile]", error.message);
    return fail(res, "Failed to save profile.", 500);
  }

  return ok(res, {
    ...data,
    interest_tags: data.interest_tags ? data.interest_tags.split(",").filter(Boolean) : [],
  });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

app.patch("/api/admin/hosts/:userId/approve", async (req, res) => {
  const secret = req.header("x-admin-secret");
  if (!adminSecret || secret !== adminSecret) {
    return fail(res, "Unauthorized.", 401);
  }

  const { userId } = req.params;
  const { error } = await supabase
    .from("host_profiles")
    .update({ is_approved: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[PATCH /api/admin/hosts/approve]", error.message);
    return fail(res, "Failed to approve host.", 500);
  }

  return ok(res, { userId, approved: true });
});

// ─── Email helper ─────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "shreevegesna@gmail.com";

async function sendAdminApplicationEmail(params: {
  applicantEmail: string;
  whatToTeach: string;
  whyTeach: string;
  qualifications: string;
}) {
  const { applicantEmail, whatToTeach, whyTeach, qualifications } = params;
  const body = [
    "New Instructor Application — Flocked",
    "",
    `Applicant: ${applicantEmail}`,
    "",
    "What they want to teach:",
    whatToTeach,
    "",
    "Why they want to teach this:",
    whyTeach,
    "",
    "What qualifies them:",
    qualifications,
    "",
    "—",
    "Approve in Supabase: set host_profiles.is_approved = true for this user.",
  ].join("\n");

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log("[Email] SMTP not configured — application notification:\n", body);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpUser,
    to: ADMIN_EMAIL,
    subject: "New Instructor Application - Flocked",
    text: body,
  });

  console.log(`[Email] Admin notified of application from ${applicantEmail}`);
}

// ─── Instructor routes ────────────────────────────────────────────────────────

// GET /api/instructor/application — no role gate (avoids timing race on first login)
app.get("/api/instructor/application", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const [{ data: application }, { data: profile }] = await Promise.all([
    supabase
      .from("instructor_applications")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("host_profiles")
      .select("is_approved")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return ok(res, {
    submitted: !!application,
    is_approved: profile?.is_approved ?? false,
    status: application?.status ?? null,
  });
});

const instructorApplicationSchema = z.object({
  whatToTeach: z.string().min(10, "Please give a bit more detail about what you want to teach."),
  whyTeach: z.string().min(10, "Please give a bit more detail about why you want to teach this."),
  qualifications: z.string().min(10, "Please give a bit more detail about your qualifications."),
});

app.post("/api/instructor/apply", requireAuth, async (req, res) => {
  const parsed = instructorApplicationSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const userEmail = (req as AuthedRequest).userEmail;
  const { whatToTeach, whyTeach, qualifications } = parsed.data;

  // Block duplicate submissions
  const { data: existing } = await supabase
    .from("instructor_applications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You have already submitted an application.");

  // Ensure user_profiles row exists with role=host
  const { data: existingUserProfile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingUserProfile) {
    await supabase.from("user_profiles").insert({ user_id: userId, role: "host" });
  }

  // Ensure host_profiles row exists (needed for is_approved check)
  const { data: existingProfile } = await supabase
    .from("host_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("host_profiles").insert({ user_id: userId });
  }

  // Save application
  const { error: insertError } = await supabase.from("instructor_applications").insert({
    user_id: userId,
    what_to_teach: whatToTeach,
    why_teach: whyTeach,
    qualifications,
  });

  if (insertError) {
    console.error("[POST /api/instructor/apply]", insertError.message);
    return fail(res, "Failed to submit application.", 500);
  }

  // Email admin — best-effort, never blocks the response
  sendAdminApplicationEmail({
    applicantEmail: userEmail,
    whatToTeach,
    whyTeach,
    qualifications,
  }).catch((err) => console.error("[Email] Admin notify failed:", err));

  return ok(res, { submitted: true }, 201);
});

// ─── Room routes ──────────────────────────────────────────────────────────────

const createRoomSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100),
  description: z.string().max(500).optional(),
  interestTag: z.enum(INTEREST_TAGS),
});

app.post("/api/rooms", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { title, description, interestTag } = parsed.data;

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      host_id: userId,
      title,
      description: description ?? null,
      interest_tag: interestTag,
      status: "live",
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/rooms]", error.message);
    return fail(res, "Failed to create room.", 500);
  }

  try {
    await roomService.createRoom({ name: room.id });
  } catch (err) {
    console.error("[POST /api/rooms] LiveKit createRoom failed:", err);
  }

  return ok(res, room, 201);
});

app.get("/api/rooms", requireAuth, async (req, res) => {
  const tag = req.query.tag as string | undefined;

  let query = supabase
    .from("rooms")
    .select(`
      *,
      host:host_profiles (
        user_id, display_name, full_name, photo_url, bio, interest_tags, is_approved, created_at
      )
    `)
    .eq("status", "live")
    .order("participant_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (tag) {
    query = query.eq("interest_tag", tag);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/rooms]", error.message);
    return fail(res, "Failed to load rooms.", 500);
  }

  const rooms = (data ?? []).map((r) => ({
    ...r,
    host: r.host
      ? {
          ...r.host,
          interest_tags: r.host.interest_tags
            ? r.host.interest_tags.split(",").filter(Boolean)
            : [],
        }
      : undefined,
  }));

  return ok(res, rooms);
});

app.get("/api/rooms/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("rooms")
    .select(`
      *,
      host:host_profiles (
        user_id, display_name, full_name, photo_url, bio, interest_tags, is_approved, created_at
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return fail(res, "Room not found.", 404);
  }

  const room = {
    ...data,
    host: data.host
      ? {
          ...data.host,
          interest_tags: data.host.interest_tags
            ? data.host.interest_tags.split(",").filter(Boolean)
            : [],
        }
      : undefined,
  };

  return ok(res, room);
});

app.patch("/api/rooms/:id/end", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: room, error: fetchError } = await supabase
    .from("rooms")
    .select("host_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !room) return fail(res, "Room not found.", 404);
  if (room.host_id !== userId) return fail(res, "You can only end your own room.", 403);
  if (room.status === "ended") return fail(res, "Room already ended.");

  const { data: updated, error } = await supabase
    .from("rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/rooms/:id/end]", error.message);
    return fail(res, "Failed to end room.", 500);
  }

  await supabase.from("room_participants").delete().eq("room_id", id);

  try {
    await roomService.deleteRoom(id);
  } catch (err) {
    console.error("[PATCH /api/rooms/:id/end] LiveKit deleteRoom failed:", err);
  }

  return ok(res, updated);
});

// ─── Participant routes ───────────────────────────────────────────────────────

app.post("/api/rooms/:id/join", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, status")
    .eq("id", id)
    .single();

  if (roomError || !room) return fail(res, "Room not found.", 404);
  if (room.status !== "live") return fail(res, "This room has ended.");

  await supabase
    .from("room_participants")
    .upsert({ room_id: id, user_id: userId }, { onConflict: "room_id,user_id" });

  const { count } = await supabase
    .from("room_participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", id);

  await supabase
    .from("rooms")
    .update({ participant_count: count ?? 0 })
    .eq("id", id);

  return ok(res, { ok: true });
});

app.post("/api/rooms/:id/leave", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  await supabase
    .from("room_participants")
    .delete()
    .eq("room_id", id)
    .eq("user_id", userId);

  const { count } = await supabase
    .from("room_participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", id);

  await supabase
    .from("rooms")
    .update({ participant_count: Math.max(0, count ?? 0) })
    .eq("id", id);

  return ok(res, { ok: true });
});

// ─── Scheduled class routes ───────────────────────────────────────────────────

const CLASS_CATEGORIES = ["Yoga", "Dance", "Tutoring"] as const;

const createClassSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100),
  category: z.enum(CLASS_CATEGORIES),
  scheduledAt: z.string().datetime({ message: "Invalid date/time." }),
  durationMinutes: z
    .number()
    .int()
    .refine((v) => [30, 45, 60, 90].includes(v), {
      message: "Duration must be 30, 45, 60, or 90 minutes.",
    }),
  maxStudents: z.number().int().min(1).max(50),
  description: z.string().max(500).optional(),
});

// GET /api/classes — upcoming classes for students, with optional category/date/hostId/sort filters
app.get("/api/classes", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const category = req.query.category as string | undefined;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  const hostId = req.query.hostId as string | undefined;
  const sort = req.query.sort as string | undefined;

  let query = supabase
    .from("scheduled_classes")
    .select(`*, host:host_profiles (display_name, full_name, photo_url, avg_rating)`)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(500);

  if (category && (CLASS_CATEGORIES as readonly string[]).includes(category)) {
    query = query.eq("category", category);
  }
  if (start) query = query.gte("scheduled_at", start);
  if (end) query = query.lte("scheduled_at", end);
  if (hostId) query = query.eq("host_id", hostId);

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/classes]", error.message);
    return fail(res, "Failed to load classes.", 500);
  }

  const classes = data ?? [];
  const classIds = classes.map((c) => c.id);
  const { data: enrollments } = classIds.length
    ? await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("user_id", userId)
        .in("class_id", classIds)
    : { data: [] as { class_id: string }[] };

  const enrolledSet = new Set((enrollments ?? []).map((e) => e.class_id));
  let result = classes.map((c) => ({ ...c, is_enrolled: enrolledSet.has(c.id) }));

  if (sort === "smart") {
    const now = Date.now();
    result = result.sort((a, b) => {
      const score = (cls: typeof a) => {
        const hoursUntil = (new Date(cls.scheduled_at).getTime() - now) / 3600000;
        const spotsPct = 1 - (cls.current_students / cls.max_students);
        const rating = (cls.host as { avg_rating?: number | null } | null)?.avg_rating ?? 3;
        return (rating * 20) + (spotsPct * 30) + (hoursUntil < 24 ? 20 : 0) - (hoursUntil / 168 * 10);
      };
      return score(b) - score(a);
    });
  }

  return ok(res, result);
});

// GET /api/classes/mine — instructor's own classes (non-cancelled), for home page
app.get("/api/classes/mine", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("scheduled_classes")
    .select("*")
    .eq("host_id", userId)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[GET /api/classes/mine]", error.message);
    return fail(res, "Failed to load your classes.", 500);
  }

  return ok(res, data ?? []);
});

// GET /api/classes/following — scheduled classes from instructors the user follows
app.get("/api/classes/following", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data: follows, error: followError } = await supabase
    .from("instructor_follows")
    .select("host_id")
    .eq("student_id", userId);

  if (followError) {
    console.error("[GET /api/classes/following]", followError.message);
    return fail(res, "Failed to load following classes.", 500);
  }

  const hostIds = (follows ?? []).map((f: { host_id: string }) => f.host_id);
  if (hostIds.length === 0) return ok(res, []);

  const { data, error } = await supabase
    .from("scheduled_classes")
    .select(`*, host:host_profiles (display_name, full_name, photo_url, avg_rating)`)
    .eq("status", "scheduled")
    .in("host_id", hostIds)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[GET /api/classes/following]", error.message);
    return fail(res, "Failed to load following classes.", 500);
  }

  const classes = data ?? [];
  const classIds = classes.map((c) => c.id);
  const { data: enrollments } = classIds.length
    ? await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("user_id", userId)
        .in("class_id", classIds)
    : { data: [] as { class_id: string }[] };

  const enrolledSet = new Set((enrollments ?? []).map((e: { class_id: string }) => e.class_id));
  return ok(res, classes.map((c) => ({ ...c, is_enrolled: enrolledSet.has(c.id) })));
});

// GET /api/classes/enrolled — all classes the current user is enrolled in
app.get("/api/classes/enrolled", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data: enrollments, error: enrollError } = await supabase
    .from("class_enrollments")
    .select("class_id")
    .eq("user_id", userId);

  if (enrollError) {
    console.error("[GET /api/classes/enrolled]", enrollError.message);
    return fail(res, "Failed to load enrolled classes.", 500);
  }

  const classIds = (enrollments ?? []).map((e: { class_id: string }) => e.class_id);
  if (classIds.length === 0) return ok(res, []);

  const { data, error } = await supabase
    .from("scheduled_classes")
    .select(`*, host:host_profiles (display_name, full_name, photo_url, avg_rating)`)
    .in("id", classIds)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[GET /api/classes/enrolled]", error.message);
    return fail(res, "Failed to load enrolled classes.", 500);
  }

  return ok(res, (data ?? []).map((c) => ({ ...c, is_enrolled: true })));
});

// POST /api/classes — instructor creates a scheduled class
app.post("/api/classes", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { title, category, scheduledAt, durationMinutes, maxStudents, description } = parsed.data;

  if (new Date(scheduledAt).getTime() <= Date.now() + 30 * 60 * 1000) {
    return fail(res, "Class must be scheduled at least 30 minutes in the future.");
  }

  const { data: cls, error } = await supabase
    .from("scheduled_classes")
    .insert({
      host_id: userId,
      title,
      category,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      max_students: maxStudents,
      current_students: 0,
      description: description ?? null,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/classes]", error.message);
    return fail(res, "Failed to create class.", 500);
  }

  return ok(res, cls, 201);
});

// DELETE /api/classes/:id — instructor cancels a class
app.delete("/api/classes/:id", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: cls, error: fetchError } = await supabase
    .from("scheduled_classes")
    .select("host_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !cls) return fail(res, "Class not found.", 404);
  if (cls.host_id !== userId) return fail(res, "You can only cancel your own classes.", 403);
  if (cls.status === "cancelled") return fail(res, "Class is already cancelled.");

  const { error } = await supabase
    .from("scheduled_classes")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/classes/:id]", error.message);
    return fail(res, "Failed to cancel class.", 500);
  }

  return ok(res, { id, cancelled: true });
});

// POST /api/classes/:id/join — student enrolls in a class
app.post("/api/classes/:id/join", requireAuth, requireUserRole(["guest"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: cls, error: fetchError } = await supabase
    .from("scheduled_classes")
    .select("id, status, max_students, current_students")
    .eq("id", id)
    .single();

  if (fetchError || !cls) return fail(res, "Class not found.", 404);
  if (cls.status !== "scheduled") return fail(res, "This class is no longer available.");
  if (cls.current_students >= cls.max_students) return fail(res, "This class is full.");

  const { data: existing } = await supabase
    .from("class_enrollments")
    .select("id")
    .eq("class_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You're already enrolled in this class.");

  const { error: enrollError } = await supabase
    .from("class_enrollments")
    .insert({ class_id: id, user_id: userId });

  if (enrollError) {
    console.error("[POST /api/classes/:id/join]", enrollError.message);
    return fail(res, "Failed to join class.", 500);
  }

  const { count } = await supabase
    .from("class_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id);

  const { data: updated } = await supabase
    .from("scheduled_classes")
    .update({ current_students: count ?? 0 })
    .eq("id", id)
    .select()
    .single();

  return ok(res, { ...(updated ?? cls), is_enrolled: true });
});

// ─── Review routes ────────────────────────────────────────────────────────────

const submitReviewSchema = z.object({
  classId: z.string().uuid(),
  instructorId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(500).optional(),
});

app.post("/api/reviews", requireAuth, requireUserRole(["guest"]), async (req, res) => {
  const parsed = submitReviewSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { classId, instructorId, rating, reviewText } = parsed.data;

  const { data: enrollment } = await supabase
    .from("class_enrollments")
    .select("id")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!enrollment) return fail(res, "You must be enrolled in the class to review it.", 403);

  const { data: review, error } = await supabase
    .from("class_reviews")
    .upsert(
      { class_id: classId, student_id: userId, instructor_id: instructorId, rating, review_text: reviewText ?? null },
      { onConflict: "class_id,student_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[POST /api/reviews]", error.message);
    return fail(res, "Failed to submit review.", 500);
  }

  return ok(res, review, 201);
});

app.get("/api/reviews/instructor/:instructorId", requireAuth, async (req, res) => {
  const { instructorId } = req.params;

  const { data, error } = await supabase
    .from("class_reviews")
    .select("id, rating, review_text, created_at, student_id")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[GET /api/reviews/instructor/:instructorId]", error.message);
    return fail(res, "Failed to load reviews.", 500);
  }

  const reviews = data ?? [];
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return ok(res, { reviews, total: reviews.length, avg_rating: avgRating });
});

// ─── Waitlist routes ──────────────────────────────────────────────────────────

app.post("/api/classes/:id/waitlist", requireAuth, requireUserRole(["guest"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: cls } = await supabase
    .from("scheduled_classes")
    .select("id, status, max_students, current_students")
    .eq("id", id)
    .single();

  if (!cls) return fail(res, "Class not found.", 404);
  if (cls.status !== "scheduled") return fail(res, "This class is no longer available.");
  if (cls.current_students < cls.max_students) return fail(res, "There are still open spots — join directly.");

  const { data: existing } = await supabase
    .from("class_waitlist")
    .select("id")
    .eq("class_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You're already on the waitlist.");

  const { error } = await supabase
    .from("class_waitlist")
    .insert({ class_id: id, user_id: userId });

  if (error) {
    console.error("[POST /api/classes/:id/waitlist]", error.message);
    return fail(res, "Failed to join waitlist.", 500);
  }

  const { count } = await supabase
    .from("class_waitlist")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id);

  return ok(res, { position: count ?? 1 }, 201);
});

app.delete("/api/classes/:id/waitlist", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { error } = await supabase
    .from("class_waitlist")
    .delete()
    .eq("class_id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[DELETE /api/classes/:id/waitlist]", error.message);
    return fail(res, "Failed to leave waitlist.", 500);
  }

  return ok(res, { removed: true });
});

// ─── Instructor follow routes ─────────────────────────────────────────────────

// GET /api/instructors/me/followers — list followers of the current host (must be before :hostId routes)
app.get("/api/instructors/me/followers", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data: follows, error } = await supabase
    .from("instructor_follows")
    .select("student_id, created_at")
    .eq("host_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/instructors/me/followers]", error.message);
    return fail(res, "Failed to load followers.", 500);
  }

  const followerIds = (follows ?? []).map((f: { student_id: string; created_at: string }) => f.student_id);
  if (followerIds.length === 0) return ok(res, []);

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", followerIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p])
  );

  return ok(
    res,
    (follows ?? []).map((f: { student_id: string; created_at: string }) => ({
      user_id: f.student_id,
      display_name: profileMap.get(f.student_id)?.display_name ?? null,
      followed_at: f.created_at,
    }))
  );
});

// GET /api/instructors/:hostId/profile — public instructor profile
app.get("/api/instructors/:hostId/profile", requireAuth, async (req, res) => {
  const { hostId } = req.params;

  const [
    { data: hostData, error: hostError },
    { data: reviews },
    { count: followerCount },
    { count: upcomingCount },
  ] = await Promise.all([
    supabase.from("host_profiles").select("*").eq("user_id", hostId).maybeSingle(),
    supabase.from("class_reviews").select("rating").eq("instructor_id", hostId),
    supabase.from("instructor_follows").select("*", { count: "exact", head: true }).eq("host_id", hostId),
    supabase
      .from("scheduled_classes")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString()),
  ]);

  if (hostError || !hostData) return fail(res, "Instructor not found.", 404);

  const reviewList = (reviews ?? []) as { rating: number }[];
  const avgRating = reviewList.length
    ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10
    : null;

  return ok(res, {
    user_id: hostData.user_id,
    display_name: hostData.display_name,
    photo_url: hostData.photo_url,
    bio: hostData.bio,
    interest_tags: hostData.interest_tags ? hostData.interest_tags.split(",").filter(Boolean) : [],
    is_approved: hostData.is_approved,
    avg_rating: avgRating,
    total_reviews: reviewList.length,
    follower_count: followerCount ?? 0,
    upcoming_classes: upcomingCount ?? 0,
  });
});

// POST /api/instructors/:hostId/follow — follow an instructor
app.post("/api/instructors/:hostId/follow", requireAuth, async (req, res) => {
  const { hostId } = req.params;
  const userId = (req as AuthedRequest).userId;

  if (userId === hostId) return fail(res, "You cannot follow yourself.");

  const { data: host } = await supabase
    .from("host_profiles")
    .select("user_id")
    .eq("user_id", hostId)
    .maybeSingle();

  if (!host) return fail(res, "Instructor not found.", 404);

  const { error } = await supabase
    .from("instructor_follows")
    .upsert({ student_id: userId, host_id: hostId }, { onConflict: "student_id,host_id" });

  if (error) {
    console.error("[POST /api/instructors/:hostId/follow]", error.message);
    return fail(res, "Failed to follow instructor.", 500);
  }

  const { count } = await supabase
    .from("instructor_follows")
    .select("*", { count: "exact", head: true })
    .eq("host_id", hostId);

  return ok(res, { following: true, follower_count: count ?? 0 }, 201);
});

// DELETE /api/instructors/:hostId/follow — unfollow an instructor
app.delete("/api/instructors/:hostId/follow", requireAuth, async (req, res) => {
  const { hostId } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { error } = await supabase
    .from("instructor_follows")
    .delete()
    .eq("student_id", userId)
    .eq("host_id", hostId);

  if (error) {
    console.error("[DELETE /api/instructors/:hostId/follow]", error.message);
    return fail(res, "Failed to unfollow instructor.", 500);
  }

  const { count } = await supabase
    .from("instructor_follows")
    .select("*", { count: "exact", head: true })
    .eq("host_id", hostId);

  return ok(res, { following: false, follower_count: count ?? 0 });
});

// GET /api/instructors/:hostId/follow — check follow status
app.get("/api/instructors/:hostId/follow", requireAuth, async (req, res) => {
  const { hostId } = req.params;
  const userId = (req as AuthedRequest).userId;

  const [{ data: follow }, { count }] = await Promise.all([
    supabase
      .from("instructor_follows")
      .select("student_id")
      .eq("student_id", userId)
      .eq("host_id", hostId)
      .maybeSingle(),
    supabase
      .from("instructor_follows")
      .select("*", { count: "exact", head: true })
      .eq("host_id", hostId),
  ]);

  return ok(res, { following: !!follow, follower_count: count ?? 0 });
});

// ─── Server ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Flocked backend listening on port ${PORT}`);
});
