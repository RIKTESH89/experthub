import { notFound } from "next/navigation";
import { NextJourneyFixture } from "@/components/expert-studio/next-journey-fixture";
export const dynamic = "force-dynamic";
export default function NextJourneysPage() {
  if (process.env.NODE_ENV !== "development" || process.env.EXPERTHUB_UI_FIXTURES !== "1") notFound();
  return <NextJourneyFixture />;
}
