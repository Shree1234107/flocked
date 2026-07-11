import "dotenv/config";

import cors from "cors";

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { Resend } from "resend";
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
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@flocked.app";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "shreevegesna@gmail.com";

// ─── Shared constants ─────────────────────────────────────────────────────────

const INTEREST_TAGS = ["Yoga", "Tutoring", "Dance"] as const;
type InterestTag = (typeof INTEREST_TAGS)[number];

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const EXPLICIT = new Set([
      "https://flocked1.netlify.app",
      "https://flocked-online.com",
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
    ]);
    const allowed =
      !origin ||
      EXPLICIT.has(origin) ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/(?:10|192\.168)\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.up\.railway\.app$/.test(origin) ||
      /flocked-online\.com$/.test(origin) ||
      /netlify\.app$/.test(origin);
    console.log(`[CORS] origin=${origin ?? "(none)"} allowed=${allowed}`);
    allowed ? callback(null, true) : callback(new Error("Not allowed by CORS"));
  },
};

// app.use sets CORS headers on all responses; app.options provides an explicit
// OPTIONS route handler so preflight requests get a 204 and never reach
// requireAuth or Express's 404 handler.
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ─── External clients ─────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret);

// Resend email client (optional — gracefully degrades if key not set)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthedRequest = express.Request & {
  userId: string;
  userEmail: string;
  userRole?: string;
};

// ─── Response helpers ─────────────────────────────────────────────────────────

const ok = <T>(res: express.Response, data: T, status = 200) =>
  res.status(status).json({ ok: true, data });

const fail = (res: express.Response, message: string, status = 400) =>
  res.status(status).json({ ok: false, message });

const zodMessage = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid request.";

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

const requireUserRole =
  (allowed: string[]) =>
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

// ─── ISO week helpers ─────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isoWeekToMonday(weekStr: string): Date {
  const [yearStr, wStr] = weekStr.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (dow - 1) * 86400000 + (week - 1) * 7 * 86400000);
  return monday;
}

function shiftWeek(weekStr: string, delta: number): string {
  const monday = isoWeekToMonday(weekStr);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return getISOWeek(monday);
}

// ─── Streak helper ────────────────────────────────────────────────────────────

async function updateStudentStreak(userId: string): Promise<void> {
  const now = new Date();

  const { data: enrollments } = await supabase
    .from("class_enrollments")
    .select("class_id, scheduled_classes(scheduled_at)")
    .eq("user_id", userId);

  if (!enrollments) return;

  const attendedWeeks = new Set<string>();
  for (const e of enrollments) {
    const cls = e.scheduled_classes as { scheduled_at: string } | null;
    if (cls?.scheduled_at && new Date(cls.scheduled_at) < now) {
      attendedWeeks.add(getISOWeek(new Date(cls.scheduled_at)));
    }
  }

  if (attendedWeeks.size === 0) {
    await supabase
      .from("user_profiles")
      .update({ current_streak: 0, last_class_week: null })
      .eq("user_id", userId);
    return;
  }

  const sortedWeeks = [...attendedWeeks].sort();
  const lastAttendedWeek = sortedWeeks[sortedWeeks.length - 1];
  const currentWeek = getISOWeek(now);
  const priorWeek = shiftWeek(currentWeek, -1);

  // Current streak: only active if user attended this week or last week
  let currentStreak = 0;
  if (lastAttendedWeek === currentWeek || lastAttendedWeek === priorWeek) {
    let checkWeek = lastAttendedWeek;
    while (attendedWeeks.has(checkWeek)) {
      currentStreak++;
      checkWeek = shiftWeek(checkWeek, -1);
    }
  }

  // Longest streak across all history
  let longestStreak = 0;
  let tempStreak = 0;
  let prev: string | null = null;
  for (const week of sortedWeeks) {
    if (prev === null || week === shiftWeek(prev, 1)) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prev = week;
  }

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("longest_streak")
    .eq("user_id", userId)
    .maybeSingle();

  const newLongest = Math.max(longestStreak, existing?.longest_streak ?? 0);

  await supabase
    .from("user_profiles")
    .update({ current_streak: currentStreak, longest_streak: newLongest, last_class_week: lastAttendedWeek })
    .eq("user_id", userId);
}

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!resend) {
    console.log(`[Email] Resend not configured — would send to ${params.to}:\n${params.text}`);
    return;
  }
  try {
    await resend.emails.send({
      from: `Flocked <${FROM_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    console.log(`[Email] Sent "${params.subject}" to ${params.to}`);
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    throw err;
  }
}

async function sendAdminApplicationEmail(params: {
  applicantEmail: string;
  whatToTeach: string;
  whyTeach: string;
  qualifications: string;
}): Promise<void> {
  const { applicantEmail, whatToTeach, whyTeach, qualifications } = params;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #87A878;">New Instructor Application — Flocked</h2>
      <p><strong>Applicant:</strong> ${applicantEmail}</p>
      <hr/>
      <h3>What they want to teach:</h3>
      <p>${whatToTeach}</p>
      <h3>Why they want to teach this:</h3>
      <p>${whyTeach}</p>
      <h3>What qualifies them:</h3>
      <p>${qualifications}</p>
      <hr/>
      <p style="color: #888; font-size: 13px;">
        To approve: set <code>host_profiles.is_approved = true</code> for this user in Supabase,
        or use the admin endpoint <code>PATCH /api/admin/hosts/:userId/approve</code>.
      </p>
    </div>
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: "New Instructor Application — Flocked",
    html,
    text: `New Instructor Application\n\nApplicant: ${applicantEmail}\n\nWhat to teach:\n${whatToTeach}\n\nWhy:\n${whyTeach}\n\nQualifications:\n${qualifications}`,
  });
}

async function sendWelcomeEmail(params: { to: string; displayName: string }): Promise<void> {
  const { to, displayName } = params;
  const name = displayName || "there";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #87A878;">Welcome to Flocked, ${name}! 🌿</h1>
      <p>You're now part of a community of people who love to learn and teach live.</p>
      <p>Explore upcoming classes in yoga, dance, and tutoring — or apply to become an instructor yourself.</p>
      <a href="https://flocked.app" style="display:inline-block; background:#87A878; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">Open Flocked</a>
      <p style="color:#888; font-size:13px; margin-top:32px;">You're receiving this because you signed up for Flocked.</p>
    </div>
  `;

  await sendEmail({
    to,
    subject: "Welcome to Flocked 🌿",
    html,
    text: `Welcome to Flocked, ${name}!\n\nYou're now part of a community of people who love to learn and teach live.\n\nExplore upcoming classes at https://flocked.app`,
  });
}

async function sendClassConfirmationEmail(params: {
  to: string;
  studentName: string;
  classTitle: string;
  instructorName: string;
  scheduledAt: string;
  durationMinutes: number;
}): Promise<void> {
  const { to, studentName, classTitle, instructorName, scheduledAt, durationMinutes } = params;
  const date = new Date(scheduledAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #87A878;">You're enrolled! 🎉</h2>
      <p>Hi ${studentName || "there"},</p>
      <p>You've successfully enrolled in <strong>${classTitle}</strong>.</p>
      <div style="background: #F9F9F9; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Class:</strong> ${classTitle}</p>
        <p style="margin: 4px 0;"><strong>Instructor:</strong> ${instructorName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedTime}</p>
        <p style="margin: 4px 0;"><strong>Duration:</strong> ${durationMinutes} minutes</p>
      </div>
      <p>We'll remind you before the class starts. See you there!</p>
      <a href="https://flocked.app" style="display:inline-block; background:#87A878; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Open Flocked</a>
    </div>
  `;

  await sendEmail({
    to,
    subject: `You're enrolled in ${classTitle}`,
    html,
    text: `You're enrolled in ${classTitle}!\n\nInstructor: ${instructorName}\nDate: ${formattedDate} at ${formattedTime}\nDuration: ${durationMinutes} minutes\n\nSee you there!`,
  });
}

// ─── Auth callback ────────────────────────────────────────────────────────────

app.get("/auth/callback", (req, res) => {
  const { access_token, refresh_token, type, code, error, error_description } =
    req.query as Record<string, string>;

  if (error) {
    return res.status(400).send(`Auth error: ${error_description ?? error}`);
  }

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
  const userEmail = (req as AuthedRequest).userEmail;
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

  const { error } = await supabase.from("user_profiles").insert({ user_id: userId, role });

  if (error) {
    console.error("[POST /api/auth/role]", error.message);
    return fail(res, "Failed to set account type.", 500);
  }

  // Send welcome email to new users (best-effort)
  sendWelcomeEmail({ to: userEmail, displayName: "" }).catch((err) =>
    console.error("[Email] Welcome email failed:", err)
  );

  return ok(res, { role }, 201);
});

// ─── Newsletter signup ────────────────────────────────────────────────────────

app.post("/api/newsletter/signup", async (req, res) => {
  const { email, name } = req.body ?? {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return fail(res, "A valid email address is required.");
  }

  // Store in newsletter_signups table
  const { error } = await supabase
    .from("newsletter_signups")
    .upsert({ email: email.trim().toLowerCase(), name: name ?? null }, { onConflict: "email" });

  if (error) {
    console.error("[POST /api/newsletter/signup]", error.message);
    // Don't fail hard — just log and continue
  }

  // Notify admin + send confirmation email (best-effort)
  const confirmHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #87A878;">You're on the list! 🌿</h2>
      <p>Hi${name ? ` ${name}` : ""},</p>
      <p>Thanks for signing up for Flocked updates. We'll let you know when we launch new features, add instructors, and go live in new areas.</p>
      <p>In the meantime, download the app and explore what's already available.</p>
      <a href="https://flocked.app" style="display:inline-block; background:#87A878; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Open Flocked</a>
    </div>
  `;

  sendEmail({
    to: email.trim(),
    subject: "You're on the Flocked list 🌿",
    html: confirmHtml,
    text: `Thanks for signing up for Flocked updates!\n\nWe'll keep you posted on launches, new instructors, and more.\n\nhttps://flocked.app`,
  }).catch((err) => console.error("[Email] Newsletter confirm failed:", err));

  return ok(res, { subscribed: true });
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

// ─── Student analytics ────────────────────────────────────────────────────────

app.get("/api/analytics/student", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const [{ data: enrollments, error: eErr }, { data: reviews, error: rErr }] = await Promise.all([
    supabase
      .from("class_enrollments")
      .select(`class_id, created_at, scheduled_classes ( title, category, scheduled_at, host_id, host:host_profiles(display_name) )`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("class_reviews")
      .select("class_id, rating, created_at")
      .eq("student_id", userId),
  ]);

  if (eErr) {
    console.error("[GET /api/analytics/student]", eErr.message);
    return fail(res, "Failed to load analytics.", 500);
  }

  const allEnrollments = enrollments ?? [];
  const allReviews = reviews ?? [];

  // Classes attended (past scheduled_at)
  const now = new Date();
  const attended = allEnrollments.filter((e) => {
    const cls = e.scheduled_classes as any;
    return cls && new Date(cls.scheduled_at) < now;
  });

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  for (const e of attended) {
    const cat = (e.scheduled_classes as any)?.category ?? "Other";
    categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
  }

  // Unique instructors
  const instructorIds = new Set(
    allEnrollments.map((e) => (e.scheduled_classes as any)?.host_id).filter(Boolean)
  );

  // Recent 5 classes
  const recentClasses = attended.slice(0, 5).map((e) => {
    const cls = e.scheduled_classes as any;
    return {
      id: e.class_id,
      title: cls?.title ?? "Unknown",
      category: cls?.category ?? "Unknown",
      scheduled_at: cls?.scheduled_at ?? e.created_at,
      instructor_name: cls?.host?.display_name ?? "Instructor",
    };
  });

  return ok(res, {
    total_enrolled: allEnrollments.length,
    total_attended: attended.length,
    total_reviews_given: allReviews.length,
    unique_instructors: instructorIds.size,
    category_breakdown: categoryCount,
    recent_classes: recentClasses,
  });
});

// ─── Streak route ─────────────────────────────────────────────────────────────

app.get("/api/streak", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("current_streak, longest_streak, last_class_week")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/streak]", error.message);
    return fail(res, "Failed to load streak.", 500);
  }

  const currentWeek = getISOWeek(new Date());
  const thisWeekAttended = (data?.last_class_week ?? null) === currentWeek;

  return ok(res, {
    current_streak: data?.current_streak ?? 0,
    longest_streak: data?.longest_streak ?? 0,
    this_week_attended: thisWeekAttended,
  });
});

// ─── Instructor analytics ─────────────────────────────────────────────────────

app.get("/api/analytics/instructor", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const [
    { data: classes, error: cErr },
    { data: reviews, error: rErr },
    { data: enrollments, error: enErr },
  ] = await Promise.all([
    supabase
      .from("scheduled_classes")
      .select("id, title, category, scheduled_at, status, current_students, max_students")
      .eq("host_id", userId)
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("class_reviews")
      .select("rating, review_text, created_at, class_id")
      .eq("instructor_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("class_enrollments")
      .select("class_id, created_at")
      .in(
        "class_id",
        (
          await supabase
            .from("scheduled_classes")
            .select("id")
            .eq("host_id", userId)
        ).data?.map((c) => c.id) ?? []
      ),
  ]);

  if (cErr) {
    console.error("[GET /api/analytics/instructor]", cErr.message);
    return fail(res, "Failed to load analytics.", 500);
  }

  const allClasses = classes ?? [];
  const allReviews = reviews ?? [];
  const allEnrollments = enrollments ?? [];

  const now = new Date();
  const completedClasses = allClasses.filter((c) => new Date(c.scheduled_at) < now);
  const upcomingClasses = allClasses.filter((c) => new Date(c.scheduled_at) >= now);

  const totalStudents = allEnrollments.length;
  const avgRating =
    allReviews.length > 0
      ? Math.round(
          (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10
        ) / 10
      : null;

  // Revenue estimate: $10 per enrollment (placeholder until Stripe is wired)
  const estimatedRevenue = totalStudents * 10;

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  for (const c of completedClasses) {
    categoryCount[c.category] = (categoryCount[c.category] ?? 0) + 1;
  }

  // Monthly enrollments (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (const e of allEnrollments) {
    const key = e.created_at.slice(0, 7); // "2025-06"
    monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
  }
  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  // Top 3 classes by enrollment
  const enrollmentsByClass: Record<string, number> = {};
  for (const e of allEnrollments) {
    enrollmentsByClass[e.class_id] = (enrollmentsByClass[e.class_id] ?? 0) + 1;
  }
  const topClasses = allClasses
    .map((c) => ({ ...c, enrollment_count: enrollmentsByClass[c.id] ?? 0 }))
    .sort((a, b) => b.enrollment_count - a.enrollment_count)
    .slice(0, 3);

  return ok(res, {
    total_classes: allClasses.length,
    completed_classes: completedClasses.length,
    upcoming_classes: upcomingClasses.length,
    total_students: totalStudents,
    avg_rating: avgRating,
    total_reviews: allReviews.length,
    estimated_revenue: estimatedRevenue,
    category_breakdown: categoryCount,
    monthly_enrollments: monthly,
    top_classes: topClasses,
    recent_reviews: allReviews.slice(0, 5),
  });
});

// ─── LiveKit routes ───────────────────────────────────────────────────────────

app.post("/api/livekit/token", requireAuth, async (req, res) => {
  const { roomId } = req.body ?? {};
  if (!roomId || typeof roomId !== "string") {
    return fail(res, "roomId is required.");
  }

  const userId = (req as AuthedRequest).userId;
  const identity = `user-${userId}`;

  // If the requester is the host of this scheduled class, mark it live.
  const { data: cls } = await supabase
    .from("scheduled_classes")
    .select("id, host_id, status")
    .eq("id", roomId)
    .maybeSingle();

  if (cls && cls.host_id === userId && cls.status !== "live" && cls.status !== "completed" && cls.status !== "cancelled") {
    const { error: statusErr } = await supabase
      .from("scheduled_classes")
      .update({ status: "live" })
      .eq("id", roomId);
    if (statusErr) console.error("[POST /api/livekit/token] set live failed:", statusErr.message);
  }

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

// ─── Instructor routes ────────────────────────────────────────────────────────

app.get("/api/instructor/application", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const [{ data: application }, { data: profile }] = await Promise.all([
    supabase
      .from("instructor_applications")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("host_profiles").select("is_approved").eq("user_id", userId).maybeSingle(),
  ]);

  return ok(res, {
    submitted: !!application,
    is_approved: profile?.is_approved ?? false,
    status: application?.status ?? null,
  });
});

const instructorApplicationSchema = z.object({
  whatToTeach: z
    .string()
    .min(10, "Please give a bit more detail about what you want to teach."),
  whyTeach: z
    .string()
    .min(10, "Please give a bit more detail about why you want to teach this."),
  qualifications: z
    .string()
    .min(10, "Please give a bit more detail about your qualifications."),
});

app.post("/api/instructor/apply", requireAuth, async (req, res) => {
  const parsed = instructorApplicationSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const userEmail = (req as AuthedRequest).userEmail;
  const { whatToTeach, whyTeach, qualifications } = parsed.data;

  const { data: existing } = await supabase
    .from("instructor_applications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You have already submitted an application.");

  const { data: existingUserProfile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingUserProfile) {
    await supabase.from("user_profiles").insert({ user_id: userId, role: "host" });
  }

  const { data: existingProfile } = await supabase
    .from("host_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("host_profiles").insert({ user_id: userId });
  }

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

  sendAdminApplicationEmail({ applicantEmail: userEmail, whatToTeach, whyTeach, qualifications }).catch(
    (err) => console.error("[Email] Admin notify failed:", err)
  );

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
    .select(
      `*, host:host_profiles ( user_id, display_name, full_name, photo_url, bio, interest_tags, is_approved, created_at )`
    )
    .eq("status", "live")
    .order("participant_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (tag) query = query.eq("interest_tag", tag);

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
    .select(
      `*, host:host_profiles ( user_id, display_name, full_name, photo_url, bio, interest_tags, is_approved, created_at )`
    )
    .eq("id", id)
    .single();

  if (error || !data) return fail(res, "Room not found.", 404);

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

  await supabase.from("rooms").update({ participant_count: count ?? 0 }).eq("id", id);

  return ok(res, { ok: true });
});

app.post("/api/rooms/:id/leave", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  await supabase.from("room_participants").delete().eq("room_id", id).eq("user_id", userId);

  const { count } = await supabase
    .from("room_participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", id);

  await supabase.from("rooms").update({ participant_count: Math.max(0, count ?? 0) }).eq("id", id);

  return ok(res, { ok: true });
});

// ─── Scheduled class routes ───────────────────────────────────────────────────

const CLASS_CATEGORIES = ["yoga", "dance", "tutoring"] as const;

const createClassSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100),
  category: z.enum(["yoga", "dance", "tutoring"]),
  scheduledAt: z.string().datetime({ message: "Invalid date/time." }),
  durationMinutes: z.number().int().refine((v) => [30, 45, 60, 90].includes(v), {
    message: "Duration must be 30, 45, 60, or 90 minutes.",
  }),
  maxStudents: z.number().int().min(1).max(50),
  description: z.string().max(500).optional(),
  classType: z.enum(["single", "dropin"]).default("single"),
});

const createSeriesSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100),
  description: z.string().max(500).optional(),
  category: z.enum(["yoga", "dance", "tutoring"]),
  totalWeeks: z.number().int().refine((v) => [4, 6, 8, 12].includes(v), {
    message: "Total weeks must be 4, 6, 8, or 12.",
  }),
  priceCents: z.number().int().min(0),
  dropinPriceCents: z.number().int().min(0),
  maxStudents: z.number().int().min(1).max(50),
  startDate: z.string().datetime({ message: "Invalid start date." }),
  dayOfWeek: z.number().int().min(0).max(6),
  timeOfDay: z.string().regex(/^\d{1,2}:\d{2}$/, "Invalid time format (use HH:MM)."),
  durationMinutes: z.number().int().refine((v) => [30, 45, 60, 90].includes(v), {
    message: "Duration must be 30, 45, 60, or 90 minutes.",
  }),
});

app.get("/api/classes", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const category = req.query.category as string | undefined;
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    // Fetch classes without the broken PostgREST join (no direct FK to host_profiles)
    let query = supabase
      .from("scheduled_classes")
      .select("*")
      .in("status", ["upcoming", "scheduled"])
      .order("scheduled_at", { ascending: true })
      .limit(500);

    if (category && (CLASS_CATEGORIES as readonly string[]).includes(category)) {
      query = query.eq("category", category);
    }
    if (start) query = query.gte("scheduled_at", start);
    if (end) query = query.lte("scheduled_at", end);

    const { data: classes, error } = await query;

    if (error) {
      console.error("[GET /api/classes] Supabase error:", error.message, error);
      return fail(res, "Failed to load classes.", 500);
    }

    // Fetch host profiles in a separate query
    const hostIds = [...new Set((classes ?? []).map((c) => c.host_id))];
    const { data: hosts } = hostIds.length
      ? await supabase
          .from("host_profiles")
          .select("user_id, display_name, full_name, photo_url, bio")
          .in("user_id", hostIds)
      : { data: [] as any[] };
    const hostMap = Object.fromEntries((hosts ?? []).map((h) => [h.user_id, h]));

    // Fetch enrollments
    const classIds = (classes ?? []).map((c) => c.id);
    const { data: enrollments } = classIds.length
      ? await supabase
          .from("class_enrollments")
          .select("class_id")
          .eq("user_id", userId)
          .in("class_id", classIds)
      : { data: [] as { class_id: string }[] };

    const enrolledSet = new Set((enrollments ?? []).map((e) => e.class_id));

    // Fetch series data for series classes (total_weeks, prices)
    const seriesIds = [...new Set((classes ?? []).filter((c) => c.series_id).map((c) => c.series_id as string))];
    const { data: seriesRows } = seriesIds.length
      ? await supabase
          .from("class_series")
          .select("id, total_weeks, price_cents, dropin_price_cents, title")
          .in("id", seriesIds)
      : { data: [] as any[] };
    const seriesMap = Object.fromEntries((seriesRows ?? []).map((s) => [s.id, s]));

    // Fetch series enrollments
    const { data: seriesEnrollments } = seriesIds.length
      ? await supabase
          .from("series_enrollments")
          .select("series_id")
          .eq("user_id", userId)
          .in("series_id", seriesIds)
      : { data: [] as { series_id: string }[] };
    const seriesEnrolledSet = new Set((seriesEnrollments ?? []).map((e) => e.series_id));

    return ok(res, (classes ?? []).map((c) => ({
      ...c,
      host: hostMap[c.host_id] ?? null,
      is_enrolled: enrolledSet.has(c.id),
      is_series_enrolled: c.series_id ? seriesEnrolledSet.has(c.series_id) : false,
      total_weeks: c.series_id ? (seriesMap[c.series_id]?.total_weeks ?? null) : null,
    })));
  } catch (err) {
    console.error("[GET /api/classes] Unhandled exception:", err);
    return fail(res, "Failed to load classes.", 500);
  }
});

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

// GET /api/classes/enrolled — student's enrolled (upcoming) classes
app.get("/api/classes/enrolled", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data: enrollments, error: eErr } = await supabase
    .from("class_enrollments")
    .select("class_id")
    .eq("user_id", userId);

  if (eErr) {
    console.error("[GET /api/classes/enrolled]", eErr.message);
    return fail(res, "Failed to load enrolled classes.", 500);
  }

  const classIds = (enrollments ?? []).map((e) => e.class_id);
  if (!classIds.length) return ok(res, []);

  const { data: classes, error } = await supabase
    .from("scheduled_classes")
    .select("*")
    .in("id", classIds)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[GET /api/classes/enrolled]", error.message);
    return fail(res, "Failed to load enrolled classes.", 500);
  }

  // Fetch host profiles separately (no direct FK for PostgREST join)
  const hostIds = [...new Set((classes ?? []).map((c) => c.host_id))];
  const { data: hosts } = hostIds.length
    ? await supabase
        .from("host_profiles")
        .select("user_id, display_name, full_name, photo_url, bio")
        .in("user_id", hostIds)
    : { data: [] as any[] };
  const hostMap = Object.fromEntries((hosts ?? []).map((h) => [h.user_id, h]));

  return ok(res, (classes ?? []).map((c) => ({ ...c, host: hostMap[c.host_id] ?? null })));
});

// GET /api/classes/following — classes from instructors the user follows
app.get("/api/classes/following", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;

    const { data: follows, error: followsError } = await supabase
      .from("user_follows")
      .select("host_id")
      .eq("follower_id", userId);

    if (followsError) {
      // Table may not exist yet — return empty list gracefully
      console.error("[GET /api/classes/following] follows error:", followsError.message);
      return ok(res, []);
    }

    if (!follows || follows.length === 0) return ok(res, []);

    const hostIds = follows.map((f) => f.host_id);

    const { data: classes, error } = await supabase
      .from("scheduled_classes")
      .select("*")
      .in("status", ["upcoming", "scheduled"])
      .in("host_id", hostIds)
      .order("scheduled_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[GET /api/classes/following] classes error:", error.message);
      return fail(res, "Failed to load following classes.", 500);
    }

    const { data: hosts } = hostIds.length
      ? await supabase
          .from("host_profiles")
          .select("user_id, display_name, full_name, photo_url, bio")
          .in("user_id", hostIds)
      : { data: [] as any[] };
    const hostMap = Object.fromEntries((hosts ?? []).map((h) => [h.user_id, h]));

    return ok(res, (classes ?? []).map((c) => ({ ...c, host: hostMap[c.host_id] ?? null })));
  } catch (err) {
    console.error("[GET /api/classes/following] Unhandled exception:", err);
    return fail(res, "Failed to load following classes.", 500);
  }
});

app.post("/api/classes", requireAuth, requireUserRole(["host"]), async (req, res) => {
  console.log("[POST /api/classes] body:", JSON.stringify(req.body));
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const { title, category, scheduledAt, durationMinutes, maxStudents, description, classType } = parsed.data;

  if (new Date(scheduledAt).getTime() <= Date.now() + 30 * 60 * 1000) {
    return fail(res, "Class must be scheduled at least 30 minutes in the future.");
  }

  const { data: cls, error } = await supabase
    .from("scheduled_classes")
    .insert({
      host_id: userId,
      title,
      category: category.toLowerCase(),
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      max_students: maxStudents,
      current_students: 0,
      description: description ?? null,
      status: "upcoming",
      class_type: classType ?? "single",
      price_cents: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/classes]", error.message);
    return fail(res, "Failed to create class.", 500);
  }

  return ok(res, cls, 201);
});

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

app.patch("/api/classes/:id/end", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: cls, error: fetchError } = await supabase
    .from("scheduled_classes")
    .select("id, host_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !cls) return fail(res, "Class not found.", 404);
  if (cls.host_id !== userId) return fail(res, "You can only end your own classes.", 403);
  if (cls.status === "completed") return fail(res, "Class is already ended.");

  const { error } = await supabase
    .from("scheduled_classes")
    .update({ status: "completed" })
    .eq("id", id);

  if (error) {
    console.error("[PATCH /api/classes/:id/end]", error.message);
    return fail(res, "Failed to end class.", 500);
  }

  try {
    await roomService.deleteRoom(id);
  } catch (err) {
    console.error("[PATCH /api/classes/:id/end] LiveKit deleteRoom failed:", err);
  }

  return ok(res, { id, ended: true });
});

app.post("/api/classes/:id/join", requireAuth, requireUserRole(["guest", "host"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;
  const userEmail = (req as AuthedRequest).userEmail;

  // No PostgREST join — scheduled_classes has no registered FK to host_profiles.
  // Fetch class and host profile separately (same pattern as GET /api/classes/:id).
  const { data: cls, error: fetchError } = await supabase
    .from("scheduled_classes")
    .select("id, status, max_students, current_students, title, host_id, scheduled_at, duration_minutes")
    .eq("id", id)
    .single();

  if (fetchError || !cls) {
    console.error("[POST /api/classes/:id/join] class fetch:", fetchError?.message ?? "not found", "id:", id);
    return fail(res, "Class not found.", 404);
  }
  if (cls.status !== "upcoming" && cls.status !== "live") return fail(res, "This class is no longer available.");
  if (cls.current_students >= cls.max_students) return fail(res, "This class is full.");

  const { data: existing } = await supabase
    .from("class_enrollments")
    .select("id")
    .eq("class_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You're already enrolled in this class.");

  // Fetch host + student profiles in parallel
  const [{ data: hostProfile }, { data: studentProfile }] = await Promise.all([
    supabase.from("host_profiles").select("display_name").eq("user_id", cls.host_id).maybeSingle(),
    supabase.from("user_profiles").select("display_name").eq("user_id", userId).maybeSingle(),
  ]);

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

  // Update streak (best-effort)
  updateStudentStreak(userId).catch((err) =>
    console.error("[POST /api/classes/:id/join] streak update failed:", err)
  );

  // Send confirmation email (best-effort)
  const instructorName = hostProfile?.display_name ?? "Your instructor";
  sendClassConfirmationEmail({
    to: userEmail,
    studentName: studentProfile?.display_name ?? "",
    classTitle: cls.title,
    instructorName,
    scheduledAt: cls.scheduled_at,
    durationMinutes: cls.duration_minutes,
  }).catch((err) => console.error("[Email] Enrollment confirm failed:", err));

  return ok(res, { ...(updated ?? cls), is_enrolled: true });
});

// ─── Single class detail ──────────────────────────────────────────────────────

app.get("/api/classes/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: cls, error } = await supabase
    .from("scheduled_classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !cls) return fail(res, "Class not found.", 404);

  const { data: host } = await supabase
    .from("host_profiles")
    .select("user_id, display_name, full_name, photo_url, bio")
    .eq("user_id", cls.host_id)
    .maybeSingle();

  const { data: enrollment } = await supabase
    .from("class_enrollments")
    .select("id")
    .eq("class_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  let is_series_enrolled = false;
  if (cls.series_id) {
    const { data: se } = await supabase
      .from("series_enrollments")
      .select("id")
      .eq("series_id", cls.series_id)
      .eq("user_id", userId)
      .maybeSingle();
    is_series_enrolled = !!se;
  }

  const { data: reviews } = await supabase
    .from("class_reviews")
    .select("id, rating, review_text, created_at, student_id")
    .eq("class_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const allReviews = reviews ?? [];
  const avg_rating =
    allReviews.length
      ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
      : null;

  let total_weeks: number | null = null;
  if (cls.series_id) {
    const { data: series } = await supabase
      .from("class_series")
      .select("total_weeks")
      .eq("id", cls.series_id)
      .maybeSingle();
    total_weeks = series?.total_weeks ?? null;
  }

  return ok(res, {
    ...cls,
    host: host ?? null,
    is_enrolled: !!enrollment,
    is_series_enrolled,
    total_weeks,
    reviews: allReviews,
    avg_rating,
  });
});

// ─── Series routes ────────────────────────────────────────────────────────────

app.post("/api/series", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const parsed = createSeriesSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const userId = (req as AuthedRequest).userId;
  const {
    title, description, category, totalWeeks, priceCents, dropinPriceCents,
    maxStudents, startDate, dayOfWeek, timeOfDay, durationMinutes,
  } = parsed.data;

  const { data: series, error: seriesError } = await supabase
    .from("class_series")
    .insert({
      host_id: userId,
      title,
      description: description ?? null,
      category: category.toLowerCase(),
      total_weeks: totalWeeks,
      price_cents: priceCents,
      dropin_price_cents: dropinPriceCents,
      max_students: maxStudents,
      current_students: 0,
      start_date: startDate,
      day_of_week: dayOfWeek,
      time_of_day: timeOfDay,
      duration_minutes: durationMinutes,
      status: "active",
    })
    .select()
    .single();

  if (seriesError || !series) {
    console.error("[POST /api/series] create series:", seriesError?.message);
    return fail(res, "Failed to create series.", 500);
  }

  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const baseDate = new Date(startDate);

  const classInserts = Array.from({ length: totalWeeks }, (_, i) => {
    const week = i + 1;
    const classDate = new Date(baseDate);
    classDate.setDate(baseDate.getDate() + i * 7);
    classDate.setHours(hours, minutes, 0, 0);
    return {
      host_id: userId,
      title: `${title} — Week ${week}`,
      category: category.toLowerCase(),
      scheduled_at: classDate.toISOString(),
      duration_minutes: durationMinutes,
      max_students: maxStudents,
      current_students: 0,
      description: description ?? null,
      status: "upcoming",
      class_type: "series",
      series_id: series.id,
      series_week: week,
      price_cents: dropinPriceCents,
    };
  });

  const { data: classes, error: classesError } = await supabase
    .from("scheduled_classes")
    .insert(classInserts)
    .select();

  if (classesError) {
    console.error("[POST /api/series] create classes:", classesError.message);
    await supabase.from("class_series").delete().eq("id", series.id);
    return fail(res, "Failed to generate series classes.", 500);
  }

  return ok(res, { ...series, classes: classes ?? [] }, 201);
});

app.get("/api/series/mine", requireAuth, requireUserRole(["host"]), async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("class_series")
    .select("*")
    .eq("host_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/series/mine]", error.message);
    return fail(res, "Failed to load your series.", 500);
  }

  return ok(res, data ?? []);
});

app.get("/api/series", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("class_series")
    .select("*")
    .eq("status", "active")
    .order("start_date", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[GET /api/series]", error.message);
    return fail(res, "Failed to load series.", 500);
  }

  return ok(res, data ?? []);
});

app.get("/api/series/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data: series, error } = await supabase
    .from("class_series")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !series) return fail(res, "Series not found.", 404);

  const { data: classes } = await supabase
    .from("scheduled_classes")
    .select("id, series_week, scheduled_at, status, current_students, max_students")
    .eq("series_id", id)
    .order("series_week", { ascending: true });

  return ok(res, { ...series, classes: classes ?? [] });
});

app.post("/api/series/:id/enroll", requireAuth, requireUserRole(["guest"]), async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: series, error: seriesError } = await supabase
    .from("class_series")
    .select("id, status, max_students, current_students, title")
    .eq("id", id)
    .single();

  if (seriesError || !series) return fail(res, "Series not found.", 404);
  if (series.status !== "active") return fail(res, "This series is no longer available.");
  if (series.current_students >= series.max_students) return fail(res, "This series is full.");

  const { data: existing } = await supabase
    .from("series_enrollments")
    .select("id")
    .eq("series_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You're already enrolled in this series.");

  const { error: enrollError } = await supabase
    .from("series_enrollments")
    .insert({ series_id: id, user_id: userId });

  if (enrollError) {
    console.error("[POST /api/series/:id/enroll]", enrollError.message);
    return fail(res, "Failed to enroll in series.", 500);
  }

  const { data: seriesClasses } = await supabase
    .from("scheduled_classes")
    .select("id")
    .eq("series_id", id)
    .neq("status", "cancelled")
    .order("series_week", { ascending: true });

  const classIds = (seriesClasses ?? []).map((c) => c.id);

  if (classIds.length > 0) {
    const { data: alreadyEnrolled } = await supabase
      .from("class_enrollments")
      .select("class_id")
      .eq("user_id", userId)
      .in("class_id", classIds);

    const alreadySet = new Set((alreadyEnrolled ?? []).map((e) => e.class_id));
    const toEnroll = classIds.filter((cid) => !alreadySet.has(cid));

    if (toEnroll.length > 0) {
      await supabase
        .from("class_enrollments")
        .insert(toEnroll.map((class_id) => ({ class_id, user_id: userId })));

      // Recount students for each enrolled class
      for (const classId of toEnroll) {
        const { count } = await supabase
          .from("class_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("class_id", classId);
        await supabase
          .from("scheduled_classes")
          .update({ current_students: count ?? 0 })
          .eq("id", classId);
      }
    }
  }

  const { count: seriesCount } = await supabase
    .from("series_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("series_id", id);

  await supabase
    .from("class_series")
    .update({ current_students: seriesCount ?? 0 })
    .eq("id", id);

  return ok(res, { series_id: id, enrolled: true });
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
      {
        class_id: classId,
        student_id: userId,
        instructor_id: instructorId,
        rating,
        review_text: reviewText ?? null,
      },
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
  const avgRating =
    reviews.length
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
  if (cls.status !== "upcoming") return fail(res, "This class is no longer available.");
  if (cls.current_students < cls.max_students)
    return fail(res, "There are still open spots — join directly.");

  const { data: existing } = await supabase
    .from("class_waitlist")
    .select("id")
    .eq("class_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return fail(res, "You're already on the waitlist.");

  const { error } = await supabase.from("class_waitlist").insert({ class_id: id, user_id: userId });

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

app.get("/api/classes/:id/waitlist/position", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data: entry } = await supabase
    .from("class_waitlist")
    .select("id, created_at")
    .eq("class_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!entry) return ok(res, { on_waitlist: false, position: null });

  // Count people ahead of this user
  const { count } = await supabase
    .from("class_waitlist")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id)
    .lte("created_at", entry.created_at);

  return ok(res, { on_waitlist: true, position: count ?? 1 });
});

// ─── Class chat ───────────────────────────────────────────────────────────────

app.get("/api/classes/:id/messages", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase
    .from("class_messages")
    .select("id, user_id, display_name, message, created_at")
    .eq("class_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return fail(res, error.message, 500);

  const messages = (data ?? []).map((m) => ({ ...m, is_mine: m.user_id === userId }));
  return ok(res, { messages });
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(500),
});

app.post("/api/classes/:id/messages", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthedRequest).userId;

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, "Message must be 1–500 characters.");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  let displayName = (profile as any)?.display_name ?? null;
  if (!displayName) {
    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();
    displayName = hostProfile?.display_name ?? "User";
  }

  const { data: msg, error } = await supabase
    .from("class_messages")
    .insert({
      class_id: id,
      user_id: userId,
      display_name: displayName,
      message: parsed.data.message,
    })
    .select("id, user_id, display_name, message, created_at")
    .single();

  if (error) return fail(res, error.message, 500);

  return ok(res, { message: { ...msg, is_mine: true } });
});

// ─── Admin middleware ─────────────────────────────────────────────────────────

const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authedReq = req as AuthedRequest;
  const secretHeader = req.header("X-Admin-Secret");
  const isAdminEmail = authedReq.userEmail === ADMIN_EMAIL;
  const isAdminSecret = adminSecret && secretHeader === adminSecret;
  if (!isAdminEmail && !isAdminSecret) return fail(res, "Forbidden.", 403);
  next();
};

// ─── Instructor applications ──────────────────────────────────────────────────

const applyToTeachSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  categories: z.array(z.string().min(1)).min(1),
  experience: z.string().min(10).max(3000),
  whyTeach: z.string().min(10).max(3000),
  availability: z.string().max(500).optional(),
});

app.get("/api/instructor-applications/me", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const { data: application } = await supabase
    .from("instructor_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (application) return ok(res, { application });

  // Backwards-compat: existing approved hosts have no application record
  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("is_approved")
    .eq("user_id", userId)
    .maybeSingle();

  if (hostProfile?.is_approved) {
    return ok(res, { application: { id: null, user_id: userId, status: "approved", categories: [], full_name: null, email: null, experience: null, why_teach: null, availability: null, submitted_at: null, reviewed_at: null } });
  }

  return ok(res, { application: null });
});

app.post("/api/instructor-applications", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = applyToTeachSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, zodMessage(parsed.error));

  const { fullName, email, categories, experience, whyTeach, availability } = parsed.data;

  // Block if already pending or approved
  const { data: existing } = await supabase
    .from("instructor_applications")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing && existing.status !== "rejected") {
    return fail(res, "You already have a pending or approved application.");
  }

  const { data, error } = await supabase
    .from("instructor_applications")
    .upsert(
      {
        user_id: userId,
        full_name: fullName,
        email,
        categories,
        experience,
        why_teach: whyTeach,
        availability: availability ?? null,
        status: "pending",
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return fail(res, error.message, 500);
  return ok(res, { application: data }, 201);
});

app.get("/api/instructor-applications", requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("instructor_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) return fail(res, error.message, 500);
  return ok(res, { applications: data ?? [] });
});

app.post("/api/instructor-applications/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("instructor_applications")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return fail(res, error.message, 500);

  // Approve their host profile if it exists
  if (data?.user_id) {
    await supabase
      .from("host_profiles")
      .update({ is_approved: true })
      .eq("user_id", data.user_id);

    await supabase
      .from("user_profiles")
      .update({ role: "host" })
      .eq("user_id", data.user_id);
  }

  return ok(res, { application: data });
});

app.post("/api/instructor-applications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("instructor_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return fail(res, error.message, 500);
  return ok(res, { application: data });
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "flocked-backend", ts: new Date().toISOString() });
});

// ─── Server ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Flocked backend listening on port ${PORT}`);
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set — emails will be logged only.");
  }
});
