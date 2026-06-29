export type StudentProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
};

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
  host?: HostProfile;
};

export type HostProfile = {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  photo_url: string | null;
  bio: string | null;
  interest_tags: string[];
  is_approved: boolean;
  created_at: string;
};

export type InstructorApplicationStatus = {
  submitted: boolean;
  is_approved: boolean;
  status: "pending" | "approved" | "rejected" | null;
};

export type ClassCategory = "Yoga" | "Dance" | "Tutoring";
export type ClassStatus = "upcoming" | "scheduled" | "live" | "completed" | "cancelled";
export type ClassDuration = 30 | 45 | 60 | 90;
export type ClassType = "single" | "series" | "dropin";

export type ScheduledClass = {
  id: string;
  host_id: string;
  title: string;
  category: ClassCategory;
  scheduled_at: string;
  duration_minutes: ClassDuration;
  max_students: number;
  current_students: number;
  description: string | null;
  status: ClassStatus;
  created_at: string;
  class_type?: ClassType;
  series_id?: string | null;
  series_week?: number | null;
  price_cents?: number;
  total_weeks?: number | null;
  is_enrolled?: boolean;
  is_series_enrolled?: boolean;
  avg_rating?: number | null;
  reviews?: ClassReviewSummary[];
  host?: {
    display_name: string | null;
    full_name: string | null;
    photo_url: string | null;
    avg_rating?: number | null;
  };
};

export type ClassReviewSummary = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  student_id: string;
};

export type ClassSeries = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: string;
  total_weeks: number;
  price_cents: number;
  dropin_price_cents: number;
  max_students: number;
  current_students: number;
  start_date: string;
  day_of_week: number;
  time_of_day: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  classes?: ScheduledClass[];
};

export type InstructorPublicProfile = {
  user_id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  interest_tags: string[];
  is_approved: boolean;
  avg_rating: number | null;
  total_reviews: number;
  follower_count: number;
  upcoming_classes: number;
};

export type ClassReview = {
  id: string;
  class_id: string;
  student_id: string;
  instructor_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

export type WaitlistEntry = {
  id: string;
  class_id: string;
  user_id: string;
  created_at: string;
  position?: number;
};
