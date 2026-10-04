import { notFound } from "next/navigation";
import { SharedUiFixture } from "./shared-fixture";

export default function SharedUiPreview() {
  if (process.env.EXPERTHUB_UI_FIXTURES !== "1" || process.env.NODE_ENV !== "development") notFound();
  return <SharedUiFixture />;
}
