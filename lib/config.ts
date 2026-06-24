export const INTEREST_TAGS = [
  "Yoga", "Tutoring", "Dance",
] as const;

export type InterestTag = typeof INTEREST_TAGS[number];
