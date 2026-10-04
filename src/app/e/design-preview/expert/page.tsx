import { notFound } from "next/navigation";
import { ExpertFixture } from "@/components/expert-studio/expert-fixture";
export const dynamic = "force-dynamic";
export default function ExpertFixturePage() {
  if (process.env.EXPERTHUB_UI_FIXTURES !== "1" || process.env.NODE_ENV !== "development") notFound();
  return <ExpertFixture />;
}
