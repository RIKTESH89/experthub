import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./expert-studio.module.css";

const chapters = [
  ["knowledge", "01", "Source library", "Keep the material behind your twin organized and current."],
  ["posts", "02", "Publishing desk", "Write, review and manage the posts you share with subscribers."],
  ["twin", "03", "Twin studio", "Shape how your AI representation responds, using your settings and evidence."],
  ["reviews", "04", "Review desk", "Review corrections and persona snapshots. Live evidence and access rules still apply."],
  ["analytics", "05", "Studio insights", "Read the activity recorded for your selected period."],
  ["subscribers", "06", "Your readership", "Manage your view of subscriber activity and subscription status."],
  ["pricing", "07", "Subscription plans", "Review plan details and billing terms before saving changes."],
  ["profile", "08", "Public identity", "Keep your expert profile clear, accurate and recognizable."],
  ["settings", "09", "Workspace preferences", "Review account preferences and the controls available to you."],
  ["widget", "10", "Embed your twin", "Configure the widget and review its instructions before sharing."],
] as const;

export function ExpertStudio({ section, children }: { section: string; children: ReactNode }) {
  const chapter = chapters.find(([key]) => section.split("/")[0] === key);
  const kind = section.includes("new") || section.includes("edit") ? "editor" : section.split("/")[0];
  const links = section.startsWith("knowledge") ? [["/expert/knowledge", "Library"], ["/expert/knowledge/import", "Import sources"], ["/expert/knowledge/new", "Write knowledge"]] : section.startsWith("posts") ? [["/expert/posts", "All posts"], ["/expert/posts/new", "Write a post"]] : section === "twin" || section === "reviews" ? [["/expert/twin", "Configuration"], ["/expert/reviews", "Corrections & releases"]] : [];
  return <section className={`${styles.studio} ${styles[kind] || ""}`} data-expert-studio={section}>
    <div className={styles.chapter}>
      <p><span>{chapter?.[1] || "00"}</span> Expert workspace / {chapter?.[2] || "Studio overview"}</p>
      <p className={styles.context}>{chapter?.[3] || "Your content, readership and AI representation at a glance."}</p>
    </div>
    {links.length > 0 ? <nav className={styles.deskNav} aria-label={`${chapter?.[2]} pages`}>{links.map(([href, label]) => <Link key={href} href={href} aria-current={href === `/expert/${section}` ? "page" : undefined}>{label}</Link>)}</nav> : null}
    <div className={styles.content}>{children}</div>
  </section>;
}
