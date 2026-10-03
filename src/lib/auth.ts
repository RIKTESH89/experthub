import { isPreviewIsolated } from "@/lib/preview-isolation";
import { approvedStagingGoogleIdentity } from "../../staging-google.cjs";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Authorization precedes every application identity query/write. No adapter is configured.
      if (isPreviewIsolated() && (account?.provider !== "google" || !approvedStagingGoogleIdentity(user.email, profile))) return false;
      if (account?.provider === "google") {
        if (!user.email || profile?.email_verified !== true) return false;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // Block banned users
          if (existingUser.isBanned || !existingUser.isActive) return false;

          // Update profile image from Google if not set
          if (!existingUser.image && user.image) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { image: user.image },
            });
          }
          return true;
        }

        // Create new user from Google sign-in (default: SUBSCRIBER)
        const newUser = await prisma.user.create({
          data: {
            name: user.name || "User",
            email: user.email,
            image: user.image,
            role: "SUBSCRIBER",
          },
        });

        // Set user.id so JWT callback gets the DB id
        user.id = newUser.id;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        // Fetch the DB user to get the real id and role
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      } else if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role as string;
      }
      // Every server auth()/session read resolves current account state. JWT role is not authority.
      if (typeof token.id !== "string" || !token.id) return null;
      const currentUser = await prisma.user.findUnique({
        where: { id: token.id }, select: { role: true, isBanned: true, isActive: true },
      });
      if (!currentUser || currentUser.isBanned || !currentUser.isActive) return null;
      token.role = currentUser.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
