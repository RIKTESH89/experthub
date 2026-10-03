export const isWithin = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
const publicPages = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/about", "/pricing", "/offline"];
export function isPublicRoute(path: string) {
  // This exact scheduler path has its own dedicated credential gate in the server route.
  return publicPages.includes(path) || path === "/api/internal/billing/worker" || path === "/api/payments/webhook" || path === "/api/expert-applications" ||
    ["/api/auth", "/api/widget", "/embed", "/shared", "/api/shared", "/e", "/api/public", "/_next", "/icons", "/uploads"].some(root => isWithin(path, root)) ||
    ["/favicon.ico", "/manifest.json", "/sw.js"].includes(path);
}
export function pageRoles(path: string): string[] | null {
  if (isWithin(path, "/admin")) return ["ADMIN"];
  if (isWithin(path, "/expert")) return ["EXPERT", "ADMIN"];
  if (isWithin(path, "/subscriber")) return ["SUBSCRIBER", "ADMIN"];
  return null;
}
