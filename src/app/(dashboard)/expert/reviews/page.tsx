import { ExpertStudio } from "@/components/expert-studio/expert-studio";
import Link from "next/link";
import { ReviewError } from "@/lib/persona/store";
import { ownerContext } from "@/lib/corrections/http";
import { ReviewWorkspace } from "@/components/corrections/review-workspace";
export const dynamic = "force-dynamic";
export default async function ExpertReviewsPage() {
  try { await ownerContext(); }
  catch (error) { if(!(error instanceof ReviewError))throw error; return <section className="space-y-4"><h1 className="text-2xl font-semibold">Expert review access required</h1><p>Sign in as the expert who owns this workspace to review corrections and persona releases.</p><Link className="underline" href="/login">Sign in</Link></section>; }
  return <ExpertStudio section="reviews"><ReviewWorkspace /></ExpertStudio>;
}
