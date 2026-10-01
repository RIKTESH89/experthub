import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!["SUBSCRIBER", "ADMIN"].includes(session.user.role)) redirect("/");
  return <>{children}</>;
}
