import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
export default async function ExpertLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!["EXPERT", "ADMIN"].includes(session.user.role)) redirect("/");
  return <>{children}</>;
}
