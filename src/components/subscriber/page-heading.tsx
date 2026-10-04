import type { ReactNode } from "react";
import styles from "./subscriber-studio.module.css";

export function SubscriberHeading({ section, title, description, children }: {
  section: string; title: string; description: string; children?: ReactNode;
}) {
  return <header className={styles.heading}>
    <div><p className={styles.eyebrow}>{section}</p><h1>{title}</h1><p className={styles.description}>{description}</p></div>
    {children && <div className={styles.headingActions}>{children}</div>}
  </header>;
}
