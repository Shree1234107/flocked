import { supabase } from "./supabase";
import {
  Room,
  HostProfile,
  StudentProfile,
  InstructorApplicationStatus,
  InstructorApplication,
  ScheduledClass,
  ClassReview,
  ClassSeries,
} from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};

  // If the token expires within 60 seconds, proactively refresh it before sending.
  // autoRefreshToken fires ~60s before expiry but won't run while the app is backgrounded,
  // so this window can be missed. Refreshing here prevents sending a stale token.
  const expiresAt = session.expires_at;
  if (expiresAt !== undefined && expiresAt < Date.now() / 1000 + 60) {
    const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
    if (refreshed.session?.access_token) {
      return { Authorization: `Bearer ${refreshed.session.access_token}` };
    }
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, options?: RequestInit, _retried = false): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers ?? {}),
    },
    signal: controller.signal,
    ...options,
  }).finally(() => clearTimeout(timeout));

  const body = await response
    .json()
    .catch(() => ({ ok: false, message: "Invalid server response." }));

  // On a 401 the access token may have just expired (e.g. the app was backgrounded and
  // the auto-refresh timer never fired). Force a refresh and retry once so the user
  // never sees a spurious "session expired" error when their refresh token is still valid.
  if (!body.ok && response.status === 401 && !_retried) {
    await supabase.auth.refreshSession().catch(() => {});
    return apiFetch<T>(path, options, true);
  }

  if (!body.ok) {
    throw new Error(body.message || "Request failed");
  }

  return body.data as T;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom(params: {
  title: string;
  description?: string;
  interestTag: string;
}): Promise<Room> {
  return apiFetch<Room>("/api/rooms", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listRooms(tag?: string): Promise<Room[]> {
  const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return apiFetch<Room[]>(`/api/rooms${qs}`);
}

export async function getRoom(id: string): Promise<Room> {
  return apiFetch<Room>(`/api/rooms/${encodeURIComponent(id)}`);
}

export async function endRoom(id: string): Promise<Room> {
  return apiFetch<Room>(`/api/rooms/${encodeURIComponent(id)}/end`, {
    method: "PATCH",
  });
}

export async function joinRoom(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/rooms/${encodeURIComponent(id)}/join`, {
    method: "POST",
  });
}

export async function leaveRoom(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/rooms/${encodeURIComponent(id)}/leave`, {
    method: "POST",
  });
}

// ─── Student profile ─────────────────────────────────────────────────────────

export async function getStudentProfile(): Promise<StudentProfile> {
  return apiFetch<StudentProfile>("/api/profile");
}

export async function updateStudentProfile(params: {
  displayName: string;
  photoUrl?: string | null;
}): Promise<void> {
  await apiFetch("/api/profile", {
    method: "PUT",
    body: JSON.stringify(params),
  });
}

export async function uploadAvatarToStorage(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const filePath = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Host profile ──────────────────────────────────────────────────────────────

export async function getHostProfile(): Promise<HostProfile | null> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/host/profile`, {
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  if (response.status === 404) return null;

  const body = await response
    .json()
    .catch(() => ({ ok: false, message: "Invalid server response." }));
  if (!body.ok) throw new Error(body.message || "Failed to load profile.");
  return body.data as HostProfile;
}

export async function saveHostProfile(params: {
  displayName: string;
  bio: string;
  interestTags: string[];
  photoUrl?: string;
}): Promise<HostProfile> {
  return apiFetch<HostProfile>("/api/host/profile", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateHostPhotoUrl(photoUrl: string): Promise<void> {
  await apiFetch("/api/host/profile/photo", {
    method: "PATCH",
    body: JSON.stringify({ photoUrl }),
  });
}

export async function updateHostProfile(params: {
  displayName: string;
  bio: string;
  interestTags: string[];
  photoUrl?: string | null;
}): Promise<HostProfile> {
  return apiFetch<HostProfile>("/api/host/profile", {
    method: "PUT",
    body: JSON.stringify(params),
  });
}

// ─── LiveKit ──────────────────────────────────────────────────────────────────

export async function getLiveKitToken(roomId: string): Promise<string> {
  const data = await apiFetch<{ token: string }>("/api/livekit/token", {
    method: "POST",
    body: JSON.stringify({ roomId }),
  });
  return data.token;
}

// ─── Auth / role ──────────────────────────────────────────────────────────────

export async function getUserRole(): Promise<"guest" | "host" | null> {
  try {
    const data = await apiFetch<{ role: string }>("/api/auth/role");
    return data.role as "guest" | "host";
  } catch {
    return null;
  }
}

export async function setUserRole(role: "guest" | "host"): Promise<"guest" | "host"> {
  const data = await apiFetch<{ role: string }>("/api/auth/role", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  return data.role as "guest" | "host";
}

// ─── Instructor application ───────────────────────────────────────────────────

export async function getInstructorApplication(): Promise<InstructorApplicationStatus> {
  return apiFetch<InstructorApplicationStatus>("/api/instructor/application");
}

export async function submitInstructorApplication(params: {
  whatToTeach: string;
  whyTeach: string;
  qualifications: string;
}): Promise<void> {
  await apiFetch<{ submitted: boolean }>("/api/instructor/apply", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Scheduled classes ────────────────────────────────────────────────────────

export async function listClasses(params?: {
  category?: string;
  start?: string;
  end?: string;
}): Promise<ScheduledClass[]> {
  const qp = new URLSearchParams();
  if (params?.category) qp.set("category", params.category);
  if (params?.start) qp.set("start", params.start);
  if (params?.end) qp.set("end", params.end);
  const qs = qp.toString() ? `?${qp.toString()}` : "";
  return apiFetch<ScheduledClass[]>(`/api/classes${qs}`);
}

export async function listMyClasses(): Promise<ScheduledClass[]> {
  return apiFetch<ScheduledClass[]>("/api/classes/mine");
}

export async function listEnrolledClasses(): Promise<ScheduledClass[]> {
  return apiFetch<ScheduledClass[]>("/api/classes/enrolled");
}

export async function getClass(id: string): Promise<ScheduledClass> {
  return apiFetch<ScheduledClass>(`/api/classes/${encodeURIComponent(id)}`);
}

export async function createClass(params: {
  title: string;
  category: string;
  scheduledAt: string;
  durationMinutes: number;
  maxStudents: number;
  description?: string;
  classType?: "single" | "dropin";
}): Promise<ScheduledClass> {
  return apiFetch<ScheduledClass>("/api/classes", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function cancelClass(id: string): Promise<void> {
  await apiFetch<{ id: string; cancelled: boolean }>(
    `/api/classes/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function endClass(id: string): Promise<void> {
  await apiFetch<{ id: string; ended: boolean }>(
    `/api/classes/${encodeURIComponent(id)}/end`,
    { method: "PATCH" }
  );
}

export async function joinClass(id: string): Promise<ScheduledClass> {
  return apiFetch<ScheduledClass>(`/api/classes/${encodeURIComponent(id)}/join`, {
    method: "POST",
  });
}

export async function listFollowingClasses(): Promise<ScheduledClass[]> {
  return apiFetch<ScheduledClass[]>("/api/classes/following");
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function submitReview(params: {
  classId: string;
  instructorId: string;
  rating: number;
  reviewText?: string;
}): Promise<ClassReview> {
  return apiFetch<ClassReview>("/api/reviews", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getInstructorReviews(instructorId: string): Promise<{
  reviews: Pick<ClassReview, "id" | "rating" | "review_text" | "created_at" | "student_id">[];
  total: number;
  avg_rating: number | null;
}> {
  return apiFetch(`/api/reviews/instructor/${encodeURIComponent(instructorId)}`);
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export async function joinWaitlist(classId: string): Promise<{ position: number }> {
  return apiFetch<{ position: number }>(
    `/api/classes/${encodeURIComponent(classId)}/waitlist`,
    { method: "POST" }
  );
}

export async function leaveWaitlist(classId: string): Promise<void> {
  await apiFetch<{ removed: boolean }>(
    `/api/classes/${encodeURIComponent(classId)}/waitlist`,
    { method: "DELETE" }
  );
}

export async function getWaitlistPosition(
  classId: string
): Promise<{ on_waitlist: boolean; position: number | null }> {
  return apiFetch(`/api/classes/${encodeURIComponent(classId)}/waitlist/position`);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type StudentAnalytics = {
  total_enrolled: number;
  total_attended: number;
  total_reviews_given: number;
  unique_instructors: number;
  category_breakdown: Record<string, number>;
  recent_classes: {
    id: string;
    title: string;
    category: string;
    scheduled_at: string;
    instructor_name: string;
  }[];
};

export type InstructorAnalytics = {
  total_classes: number;
  completed_classes: number;
  upcoming_classes: number;
  total_students: number;
  avg_rating: number | null;
  total_reviews: number;
  estimated_revenue: number;
  category_breakdown: Record<string, number>;
  monthly_enrollments: { month: string; count: number }[];
  top_classes: {
    id: string;
    title: string;
    category: string;
    enrollment_count: number;
  }[];
  recent_reviews: {
    rating: number;
    review_text: string | null;
    created_at: string;
  }[];
};

export async function getStudentAnalytics(): Promise<StudentAnalytics> {
  return apiFetch<StudentAnalytics>("/api/analytics/student");
}

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  this_week_attended: boolean;
};

export async function getStreak(): Promise<StreakData> {
  return apiFetch<StreakData>("/api/streak");
}

export async function getInstructorAnalytics(): Promise<InstructorAnalytics> {
  return apiFetch<InstructorAnalytics>("/api/analytics/instructor");
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export async function signUpForNewsletter(params: {
  email: string;
  name?: string;
}): Promise<void> {
  await apiFetch<{ subscribed: boolean }>("/api/newsletter/signup", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const path = `${userId}.jpg`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Series ───────────────────────────────────────────────────────────────────

export async function createSeries(params: {
  title: string;
  description?: string;
  category: string;
  totalWeeks: number;
  priceCents: number;
  dropinPriceCents: number;
  maxStudents: number;
  startDate: string;
  dayOfWeek: number;
  timeOfDay: string;
  durationMinutes: number;
}): Promise<ClassSeries> {
  return apiFetch<ClassSeries>("/api/series", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listSeries(): Promise<ClassSeries[]> {
  return apiFetch<ClassSeries[]>("/api/series");
}

export async function getMySeries(): Promise<ClassSeries[]> {
  return apiFetch<ClassSeries[]>("/api/series/mine");
}

export async function getSeries(id: string): Promise<ClassSeries> {
  return apiFetch<ClassSeries>(`/api/series/${encodeURIComponent(id)}`);
}

export async function enrollInSeries(seriesId: string): Promise<void> {
  await apiFetch<{ series_id: string; enrolled: boolean }>(
    `/api/series/${encodeURIComponent(seriesId)}/enroll`,
    { method: "POST" }
  );
}

// ─── Instructor applications (v2 — new table) ────────────────────────────────

export async function getMyInstructorApplication(): Promise<InstructorApplication | null> {
  const data = await apiFetch<{ application: InstructorApplication | null }>(
    "/api/instructor-applications/me"
  );
  return data.application;
}

export async function applyToTeach(params: {
  fullName: string;
  email: string;
  categories: string[];
  experience: string;
  whyTeach: string;
  availability?: string;
}): Promise<InstructorApplication> {
  const data = await apiFetch<{ application: InstructorApplication }>(
    "/api/instructor-applications",
    { method: "POST", body: JSON.stringify(params) }
  );
  return data.application;
}

export async function listInstructorApplications(): Promise<InstructorApplication[]> {
  const data = await apiFetch<{ applications: InstructorApplication[] }>(
    "/api/instructor-applications"
  );
  return data.applications;
}

export async function approveInstructorApplication(id: string): Promise<InstructorApplication> {
  const data = await apiFetch<{ application: InstructorApplication }>(
    `/api/instructor-applications/${encodeURIComponent(id)}/approve`,
    { method: "POST" }
  );
  return data.application;
}

export async function rejectInstructorApplication(id: string): Promise<InstructorApplication> {
  const data = await apiFetch<{ application: InstructorApplication }>(
    `/api/instructor-applications/${encodeURIComponent(id)}/reject`,
    { method: "POST" }
  );
  return data.application;
}

// ─── Instructor follow ────────────────────────────────────────────────────────

export type InstructorPublicProfile = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  interest_tags: string[];
  photo_url: string | null;
  avg_rating: number | null;
  total_reviews: number;
  upcoming_classes: number;
};

export async function getInstructorPublicProfile(
  instructorId: string
): Promise<InstructorPublicProfile> {
  return apiFetch<InstructorPublicProfile>(
    `/api/instructors/${encodeURIComponent(instructorId)}/public-profile`
  );
}

export async function getFollowStatus(
  instructorId: string
): Promise<{ following: boolean; follower_count: number }> {
  return apiFetch(`/api/instructors/${encodeURIComponent(instructorId)}/follow-status`);
}

export async function followInstructor(instructorId: string): Promise<void> {
  await apiFetch(`/api/instructors/${encodeURIComponent(instructorId)}/follow`, {
    method: "POST",
  });
}

export async function unfollowInstructor(instructorId: string): Promise<void> {
  await apiFetch(`/api/instructors/${encodeURIComponent(instructorId)}/follow`, {
    method: "DELETE",
  });
}

export async function getHostFollowers(): Promise<
  { user_id: string; display_name: string | null; created_at: string }[]
> {
  return apiFetch("/api/me/followers");
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type AppNotification = {
  id: string;
  type: "new_class" | "class_reminder" | "welcome";
  title: string;
  body: string;
  class_id: string | null;
  instructor_id: string | null;
  read: boolean;
  created_at: string;
};

export async function getNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>("/api/notifications");
}

export async function getUnreadNotificationCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>("/api/notifications/unread-count");
  return data.count;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/notifications/read-all", { method: "PATCH" });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  user_id: string;
  display_name: string;
  message: string;
  created_at: string;
  is_mine: boolean;
};

export async function getClassMessages(classId: string): Promise<ChatMessage[]> {
  const body = await apiFetch<{ messages: ChatMessage[] }>(`/api/classes/${encodeURIComponent(classId)}/messages`);
  return body.messages;
}

export async function sendClassMessage(classId: string, message: string): Promise<ChatMessage> {
  const body = await apiFetch<{ message: ChatMessage }>(
    `/api/classes/${encodeURIComponent(classId)}/messages`,
    { method: "POST", body: JSON.stringify({ message }) }
  );
  return body.message;
}
