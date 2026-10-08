import { notFound } from "next/navigation";
import { ContinuationJourneyFixture } from "@/components/expert-studio/continuation-journey-fixture";
export const dynamic = "force-dynamic";
export default function ContinuationJourneysPage() {
  if (process.env.NODE_ENV !== "development" || process.env.EXPERTHUB_UI_FIXTURES !== "1") notFound();
  return <ContinuationJourneyFixture />;
}
