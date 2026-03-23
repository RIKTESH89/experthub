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
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(to right, #6366f1, #8b5cf6)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ExpertHub &mdash; Expert {expertId}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Chat widget loaded
          </div>
        </div>

        <script src="/embed/widget.js" defer />
      </body>
    </html>
  );
}
