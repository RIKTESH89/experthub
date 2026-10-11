import Link from "next/link";
import styles from "./wordmark.module.css";

/** Matches the accepted digital-brain homepage wordmark. Only colors follow theme. */
export function BrandWordmark() {
  return <>Expert<span className={styles.hub}>Hub</span><i className={styles.star} aria-hidden="true">✳</i></>;
}

export function BrandLink({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  return <Link href="/" aria-label="ExpertHub homepage" className={`${styles.wordmark} ${className}`} onClick={onClick}><BrandWordmark /></Link>;
}
