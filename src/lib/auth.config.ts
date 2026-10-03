import { isPreviewIsolated } from "@/lib/preview-isolation";
import { stagingGoogleConfig } from "../../staging-google.cjs";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const stagingGoogle = stagingGoogleConfig();

// Edge-safe configuration: database authorization belongs to server auth/layouts.
export const authConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: isPreviewIsolated() ? (stagingGoogle ? [GoogleProvider({
    ...stagingGoogle, authorization: { params: { scope: "openid email profile" } },
  })] : []) : [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  })],
  callbacks: {
    session({ session, token }) {
      if (session.user) { session.user.id = typeof token.id === "string" ? token.id : ""; session.user.role = typeof token.role === "string" ? token.role : ""; }
      return session;
    },
  },
} satisfies NextAuthConfig;
