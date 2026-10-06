import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ExpertApplicationSection } from "@/components/landing/expert-application-section";
import { publicPricingTiers } from "@/lib/public-launch-copy";
import { chapters } from "./timeline";
import { BrainRuntime } from "./runtime";
import styles from "./home.module.css";

export function DigitalBrainHome() {
  return <div className={styles.home} data-digital-brain-home="" data-renderer="static">
    <Link href="#story-reading" className="skip">Skip to the story</Link>
    <header className="site-nav">
      <Link href="/" className="wordmark" aria-label="ExpertHub homepage">Expert<span>Hub</span><i aria-hidden="true">✳</i></Link>
      <nav aria-label="Main navigation"><Link href="#plans">Pricing</Link><Link href="#apply-expert">Apply</Link><Link href="/login">Sign in</Link><ThemeToggle /></nav>
    </header>
    <main>
      <section className="story-sequence" data-story-sequence="" aria-label="How shared knowledge becomes a Digital Twin">
        <div className="viewport">
          <Image className="poster" src="/uploads/digital-brain-foundation/brain-poster.webp" width={1470} height={900} alt="" priority unoptimized />
          <div className="artwork" data-artwork="" role="group" aria-label="Interactive brain illustration. Drag horizontally, or focus here and use the left and right arrow keys to rotate." tabIndex={0}><canvas data-brain-canvas="" aria-hidden="true" /></div>
          <div className="visual-captions" aria-hidden="true">{chapters.map((chapter, index) => <div key={chapter.id} className={`caption ${chapter.side}`} data-caption-index={index}><p className="eyebrow">{chapter.label}</p><p className="display-title">{chapter.title}</p><p className="caption-body">{chapter.body}</p></div>)}</div>
          <div className="scene-actions" data-scene-actions=""><Link className="cta primary" href="/login">Sign in to explore <span aria-hidden="true">↗</span></Link><Link className="cta secondary" href="#apply-expert">Apply as an expert</Link></div>
          <p className="orbit-hint" aria-hidden="true">Drag to explore · Scroll to follow the story</p>
        </div>
        <div className="reading-story" id="story-reading" tabIndex={-1}>
          <Image className="reading-poster" src="/uploads/digital-brain-foundation/brain-poster.webp" width={780} height={820} alt="A solid green brain sculpture with brass threads, used as an illustration of shared knowledge." priority unoptimized />
          {chapters.map((chapter, index) => <section key={chapter.id} id={chapter.id} aria-labelledby={`heading-${chapter.id}`}>
            <p className="eyebrow">{chapter.label}</p>
            {index === 0 ? <h1 id={`heading-${chapter.id}`}>{chapter.title}</h1> : <h2 id={`heading-${chapter.id}`}>{chapter.title}</h2>}
            <p>{chapter.body}</p>
            {(index === 0 || index === 6) && <div className="action-group"><Link className="cta primary" href="/login">Sign in to explore <span aria-hidden="true">↗</span></Link><Link className="cta secondary" href="#apply-expert">Apply as an expert</Link></div>}
          </section>)}
        </div>
      </section>
      <section className="product-continuation" id="plans" aria-labelledby="plans-heading">
        <div className="section-heading"><p className="eyebrow">Access, on your terms</p><h2 id="plans-heading" tabIndex={-1}>Choose an expert.<br />Review their plan.</h2><p>Each expert sets their paid plan prices. Free access and trial questions vary by expert. Review their plan before subscribing.</p><Link className="text-link" href="/pricing">Access and pricing details <span aria-hidden="true">↗</span></Link></div>
        <div className="pricing-plans">{publicPricingTiers.map(tier => <article key={tier.name}><p className="eyebrow">{tier.name}</p><h3>{tier.price} <small>{tier.period}</small></h3><p>{tier.description}</p><ul>{tier.features.map(feature => <li key={feature}>{feature}</li>)}</ul><Link className="text-link" href={tier.href}>{tier.href === "/login" ? "Sign in to explore" : tier.cta} <span aria-hidden="true">↗</span></Link></article>)}</div>
        <ExpertApplicationSection />
      </section>
    </main>
    <footer>
      <div className="limits"><p className="eyebrow">Sources, context and limits</p><h2>AI conversations.<br />Human judgment.</h2><p>Digital Twins are AI representations based on shared content. They can be wrong, incomplete or differ from an expert’s current views. Check available sources and contact the expert when you need their own judgment.</p><p>The brain is an illustration, not a scan. It does not access private, unshared memories or represent consciousness. Citations help you inspect an answer; they do not guarantee correctness.</p>
        <details><summary>Read a sample question and answer</summary><div id="sample-conversation"><p className="eyebrow">Illustrative example · scripted, not live AI</p><p><strong>Question</strong><br />How should I begin choosing an option?</p><blockquote>Begin with a clear question. Compare the available options against the stated constraint.</blockquote><p>Sample sources: <a href="#sample-source-context">Context note</a> and <a href="#sample-source-options">Compare options</a>.</p><p id="sample-source-context"><strong>Context note · fictional</strong><br />“Begin with a clear question. Keep its context in view.”</p><p id="sample-source-options"><strong>Compare options · fictional</strong><br />“Compare the available options against the stated constraint.”</p></div></details>
      </div>
      <div className="credits"><Link href="/about">About Digital Twins</Link><p>Brain Areas by <a href="https://sketchfab.com/3d-models/brain-areas-d64608a3978b47d8a39c5a15795ca8c4">Versal</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Materials, palette, particles and camera adapted for ExpertHub.</p><p>Digital Brain by Sahil K and camera choreography adapted from JosephASG / Codrops, under MIT.</p><a href="/uploads/digital-brain-foundation/CREDITS.md">Artwork credits, licenses and modifications</a></div>
    </footer>
    <BrainRuntime />
    <noscript><style>{`[data-digital-brain-home] .motion-toolbar { display: none; }`}</style><p className="static-notice">The complete story is available above without animation.</p></noscript>
  </div>;
}
