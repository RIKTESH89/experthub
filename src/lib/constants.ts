export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EXPERT: "Expert",
  SUBSCRIBER: "Subscriber",
};

export const MEDIA_TYPE_LABELS: Record<string, string> = {
  TEXT: "Text",
  VIDEO: "Video",
  AUDIO: "Audio",
  IMAGE: "Image",
};

export const POST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  PAST_DUE: "Past Due",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  INAPPROPRIATE: "Inappropriate Content",
  MISINFORMATION: "Misinformation",
  OTHER: "Other",
};

export const KNOWLEDGE_SOURCE_LABELS: Record<string, string> = {
  manual: "Manual Entry",
  document: "Document Upload",
  post: "From Post",
};

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/about",
  "/pricing",
];

export const DEFAULT_REDIRECT: Record<string, string> = {
  ADMIN: "/admin",
  EXPERT: "/expert",
  SUBSCRIBER: "/subscriber",
};

export const TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export const TIER_DESCRIPTIONS: Record<string, string> = {
  FREE: "Limited Digital Twin access",
  STANDARD: "Posts + limited Digital Twin access",
  PREMIUM: "Unlimited Digital Twin + exclusive content",
};

export const DEFAULT_TIER_PRICES: Record<string, number> = {
  FREE: 0,
  STANDARD: 9.99,
  PREMIUM: 29.99,
};

export const DEFAULT_FREE_QUESTIONS = 3;
export const DEFAULT_STANDARD_QUESTIONS = 20;

export const ACTIVE_TIERS: string[] = ["FREE", "PREMIUM"];
