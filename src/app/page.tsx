import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { publicPageMetadata } from "@/lib/public-metadata";
import { DigitalBrainHome } from "@/components/home/digital-brain/home";
import type { Viewport } from "next";
export const viewport: Viewport = { themeColor: "#151411" };
export function generateMetadata() { return publicPageMetadata("/", "ExpertHub — Expert knowledge, AI conversations"); }
export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as { role?: string }).role || "";
    if (role === "ADMIN") redirect("/admin");
    if (role === "EXPERT") redirect("/expert");
    redirect("/subscriber/feed");
  }
  return <DigitalBrainHome />;
}
