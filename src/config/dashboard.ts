export const dashboardConfig = {
  postsPerPage: 10,
  subscribersPerPage: 20,
  usersPerPage: 20,
  reportsPerPage: 15,
  knowledgeItemsPerPage: 20,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  allowedVideoTypes: ["video/mp4", "video/webm"],
  allowedAudioTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
  maxMediaPerPost: 10,
  chatMessageLimit: 50,
  ragTopK: 5,
  ragScoreThreshold: 0.1,
};

export const statsRefreshInterval = 30000; // 30 seconds

export const chartColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};
