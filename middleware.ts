import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/about", "/pricing", "/offline"];
const authApiRoute = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow auth API routes
  if (pathname.startsWith(authApiRoute)) {
    return NextResponse.next();
  }

  // Allow widget API and embed routes (public, no auth required)
  if (pathname.startsWith("/api/widget") || pathname.startsWith("/embed")) {
    return NextResponse.next();
  }

  // Allow shared conversation routes (public, no auth required)
  if (pathname.startsWith("/shared") || pathname.startsWith("/api/shared")) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as string) || "";

  // Admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Expert routes
  if (pathname.startsWith("/expert") || pathname.startsWith("/api/expert")) {
    if (role !== "EXPERT" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Subscriber routes
  if (pathname.startsWith("/subscriber") || pathname.startsWith("/api/subscriber")) {
    if (role !== "SUBSCRIBER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
