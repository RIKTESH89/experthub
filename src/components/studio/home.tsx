import Link from "next/link";
import styles from "./knowledge-story.module.css";
import { KnowledgeStory } from "./knowledge-story";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ExpertApplicationSection } from "@/components/landing/expert-application-section";
import { publicPricingTiers } from "@/lib/public-launch-copy";

export function StudioHome() {
  return <div className="studio-home">
    <a className="studio-skip" href="#main-content">Skip to content</a>
    <header className={`studio-nav ${styles.nav}`}><Link href="/" className="studio-brand"><span aria-hidden="true">e.</span> ExpertHub</Link><nav aria-label="Main navigation"><Link href="/about">Our approach</Link><Link href="/pricing">Pricing</Link><ThemeToggle /><Link className="studio-link" href="/login">Sign in <ArrowRight size={16}/></Link></nav></header>
    <main id="main-content" tabIndex={-1}>
      <KnowledgeStory />
      <section className="studio-section"><div className="studio-section-heading"><div><p className="studio-eyebrow">Access, on your terms</p><h2>Choose an expert.<br/>Review their plan.</h2></div><Link className="studio-text-link" href="/pricing">Understand pricing <ArrowRight size={18}/></Link></div><div className="studio-plans">{publicPricingTiers.map(tier=><article key={tier.name}><p className="studio-eyebrow">{tier.name}</p><h3>{tier.price} <small>{tier.period}</small></h3><p>{tier.description}</p><ul>{tier.features.map(feature=><li key={feature}>{feature}</li>)}</ul><Link className="studio-text-link" href={tier.href}>{tier.cta}<ArrowRight size={17}/></Link></article>)}</div></section>
      <div className="studio-application"><ExpertApplicationSection/></div>
    </main><footer className="studio-footer"><Link href="/" className="studio-brand">ExpertHub</Link><p>Expert content. AI conversations. Your judgment.</p><nav aria-label="Footer"><Link href="/about">About</Link><Link href="/pricing">Pricing</Link><Link href="/login">Sign in</Link></nav></footer>
  </div>;
}
