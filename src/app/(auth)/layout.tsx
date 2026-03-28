import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthLayoutClient } from "./auth-layout-client";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role || "";
    if (role === "ADMIN") redirect("/admin");
    if (role === "EXPERT") redirect("/expert");
    redirect("/subscriber/feed");
  }
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
