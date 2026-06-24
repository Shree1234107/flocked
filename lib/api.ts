import { supabase } from "./supabase";
import { Room, HostProfile, StudentProfile, InstructorApplicationStatus, ScheduledClass, ClassReview, InstructorPublicProfile } from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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

  const body = await response.json().catch(() => ({ ok: false, message: "Invalid server response." }));

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


// ─── Host profile ──────────────────────────────────────────────────────────────

export async function getHostProfile(): Promise<HostProfile | null> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/host/profile`, {
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  if (response.status === 404) return null;

  const body = await response.json().catch(() => ({ ok: false, message: "Invalid server response." }));
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
  hostId?: string;
  sort?: "smart";
}): Promise<ScheduledClass[]> {
  const qp = new URLSearchParams();
  if (params?.category) qp.set("category", params.category);
  if (params?.start) qp.set("start", params.start);
  if (params?.end) qp.set("end", params.end);
  if (params?.hostId) qp.set("hostId", params.hostId);
  if (params?.sort) qp.set("sort", params.sort);
  const qs = qp.toString() ? `?${qp.toString()}` : "";
  return apiFetch<ScheduledClass[]>(`/api/classes${qs}`);
}

export async function listMyClasses(): Promise<ScheduledClass[]> {
  return apiFetch<ScheduledClass[]>("/api/classes/mine");
}

export async function createClass(params: {
  title: string;
  category: string;
  scheduledAt: string;
  durationMinutes: number;
  maxStudents: number;
  description?: string;
}): Promise<ScheduledClass> {
  return apiFetch<ScheduledClass>("/api/classes", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function cancelClass(id: string): Promise<void> {
  await apiFetch<{ id: string; cancelled: boolean }>(`/api/classes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function joinClass(id: string): Promise<ScheduledClass> {
  return apiFetch<ScheduledClass>(`/api/classes/${encodeURIComponent(id)}/join`, {
    method: "POST",
  });
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
  return apiFetch<{ position: number }>(`/api/classes/${encodeURIComponent(classId)}/waitlist`, {
    method: "POST",
  });
}

export async function leaveWaitlist(classId: string): Promise<void> {
  await apiFetch<{ removed: boolean }>(`/api/classes/${encodeURIComponent(classId)}/waitlist`, {
    method: "DELETE",
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

// ─── Enrolled classes ─────────────────────────────────────────────────────────

export async function listEnrolledClasses(): Promise<ScheduledClass[]> {
  return apiFetch<ScheduledClass[]>("/api/classes/enrolled");
}

// ─── Instructor follow system ─────────────────────────────────────────────────

export async function followInstructor(hostId: string): Promise<void> {
  await apiFetch<{ following: boolean; follower_count: number }>(
    `/api/instructors/${encodeURIComponent(hostId)}/follow`,
    { method: "POST" }
  );
}

export async function unfollowInstructor(hostId: string): Promise<void> {
  await apiFetch<{ following: boolean; follower_count: number }>(
    `/api/instructors/${encodeURIComponent(hostId)}/follow`,
    { method: "DELETE" }
  );
}

export async function getFollowStatus(hostId: string): Promise<{ following: boolean; follower_count: number }> {
  return apiFetch<{ following: boolean; follower_count: number }>(
    `/api/instructors/${encodeURIComponent(hostId)}/follow`
  );
}

export async function listFollowingClasses(): Promise<ScheduledClass[]> {
  return apiFetch<ScheduledClass[]>("/api/classes/following");
}

export async function getInstructorPublicProfile(hostId: string): Promise<InstructorPublicProfile> {
  return apiFetch<InstructorPublicProfile>(
    `/api/instructors/${encodeURIComponent(hostId)}/profile`
  );
}

export async function getMyFollowers(): Promise<Array<{ user_id: string; display_name: string | null; followed_at: string }>> {
  return apiFetch("/api/instructors/me/followers");
}
