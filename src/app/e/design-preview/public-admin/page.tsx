import { notFound } from "next/navigation";
import { PublicAdminFixture } from "./fixture";
export const dynamic = "force-dynamic";
export default function Page() {
  if (process.env.EXPERTHUB_UI_FIXTURES !== "1" || process.env.NODE_ENV !== "development") notFound();
  return <PublicAdminFixture />;
}
