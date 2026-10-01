import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { isPublicRoute } from "@/lib/route-access";

// No Prisma in Edge middleware. Server auth and layouts enforce live account/role state.
export default NextAuth(authConfig).auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublicRoute(pathname)) return NextResponse.next();
  if (!req.auth?.user?.id) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
