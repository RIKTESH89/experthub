import Link from "next/link";
import { BrandLink } from "@/components/brand/wordmark";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ExpertHub Chat Widget",
};

export default async function EmbedExpertPage({
  params,
}: {
  params: Promise<{ expertId: string }>;
}) {
  const { expertId } = await params;

  return (
    <>
      <div className="font-sans">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100svh",
            backgroundColor: "hsl(var(--background))",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <BrandLink />
            <p className="text-sm text-muted-foreground">Expert {expertId}</p>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              color: "hsl(var(--muted-foreground))",
              fontSize: "14px",
            }}
          >
            <div className="max-w-md space-y-4 text-center">
              <p>This page does not have a configured chat widget. Website owners can get the installation snippet from their expert workspace under Embed Widget.</p>
              <p>AI Digital Twin responses are available through a configured widget or the expert profile.</p>
              <Link className="inline-flex min-h-11 items-center underline" href={`/e/${encodeURIComponent(expertId)}`}>View expert profile</Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
