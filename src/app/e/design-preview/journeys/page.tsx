import { notFound } from "next/navigation";
import { ProductJourneyFixture } from "@/components/expert-studio/product-journey-fixture";
export const dynamic = "force-dynamic";
export default function ProductJourneysPage() {
  if (process.env.EXPERTHUB_UI_FIXTURES !== "1" || process.env.NODE_ENV !== "development") notFound();
  return <ProductJourneyFixture />;
}
