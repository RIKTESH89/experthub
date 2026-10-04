/** Account status follows the actual read DTO; missing flags are never a ban. */
export function userRowStatus(user: { isActive?: boolean; isBanned?: boolean }): "active" | "banned" | "inactive" | "unknown" {
  if (user.isBanned === true) return "banned";
  if (user.isActive === false) return "inactive";
  if (user.isActive === true && user.isBanned === false) return "active";
  return "unknown";
}
