import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/about", "/pricing", "/offline"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public routes (/, /login, /register handle their own redirects server-side)
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow auth API routes
  if (pathname.startsWith("/api/auth")) {
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

  // Allow public expert profile pages and their API (no auth required)
  if (pathname.startsWith("/e/") || pathname.startsWith("/api/public/")) {
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

  // Redirect unauthenticated users to login
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = ((session.user as { role?: string }).role as string) || "";

  // Admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Expert routes
  if (pathname.startsWith("/expert") || pathname.startsWith("/api/expert")) {
    if (role !== "EXPERT" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Subscriber routes
  if (pathname.startsWith("/subscriber") || pathname.startsWith("/api/subscriber")) {
    if (role !== "SUBSCRIBER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
