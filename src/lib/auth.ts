import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // Block banned users
          if (existingUser.isBanned) return false;

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
