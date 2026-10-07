import Link from "next/link";
import Image from "next/image";
import { ExpertApplicationSection } from "@/components/landing/expert-application-section";
import { publicPricingTiers } from "@/lib/public-launch-copy";
import { chapters } from "./timeline";
import { BrainRuntime } from "./runtime";
import { scenePerspectives } from "./source-perspectives";
import styles from "./home.module.css";

export function DigitalBrainHome() {
  return <div className={`${styles.home} dark`} data-digital-brain-home="" data-home-theme="dark" data-renderer="boot" data-illustration-ready="false">
    <Link href="#story-reading" className="skip">Skip to the story</Link>
    <header className="site-nav">
      <Link href="/" className="wordmark" aria-label="ExpertHub homepage">Expert<span>Hub</span><i aria-hidden="true">✳</i></Link>
      <nav aria-label="Main navigation"><Link href="#plans">Pricing</Link><Link href="#apply-expert">Apply</Link><Link href="/login">Explore experts</Link></nav>
    </header>
    <BrainRuntime />
    <div className="viewport">
      <Image className="poster" src="/uploads/digital-brain-foundation/brain-poster-dark.png" width={780} height={820} alt="" priority unoptimized />
      <div className="artwork" data-artwork="" aria-hidden="true"><canvas data-brain-canvas="" /></div>
      <div className="visual-captions" aria-hidden="true">{scenePerspectives.map((perspective, index) => <div key={index} className={`source-caption source-${perspective.position}`} data-source-slot={index} data-caption-index={index}>
        <h2>{perspective.title}</h2><p>{perspective.subtitle}</p>
      </div>)}</div>
      <div className="scroll-hint" aria-hidden="true"><svg width="24" height="32" viewBox="0 0 24 32"><path d="M12 4 L12 24 M12 24 L8 20 M12 24 L16 20" stroke="currentColor" strokeWidth=".5" fill="none" /></svg><i /></div>
    </div>
    <div data-smooth-wrapper=""><div data-smooth-content="">
    <main>
      <section className="story-sequence" data-story-sequence="" aria-label="Explore expert content and AI conversations">
        <div className="reading-story" id="story-reading" tabIndex={-1}>
          <Image className="reading-poster" data-poster-src="/uploads/digital-brain-foundation/brain-poster-dark.png" src="/uploads/digital-brain-foundation/brain-poster-dark.png" width={780} height={820} alt="A warm dark brain sculpture with fine brown threads, used as an illustration of shared knowledge." priority unoptimized />
          {chapters.map((chapter, index) => <section key={chapter.id} id={chapter.id} aria-labelledby={`heading-${chapter.id}`}>
            <p className="eyebrow">{chapter.label}</p>
            {index === 0 ? <h1 id={`heading-${chapter.id}`}>{chapter.title}</h1> : <h2 id={`heading-${chapter.id}`}>{chapter.title}</h2>}
            <p>{chapter.body}</p>
            {(index === 0 || index === 6) && <div className="action-group"><Link className="cta primary" href="/login">Explore experts <span aria-hidden="true">↗</span></Link><Link className="cta secondary" href="#plans">View pricing</Link></div>}
          </section>)}
        </div>
      </section>
      <section className="product-continuation" id="plans" aria-labelledby="plans-heading">
        <div className="section-heading"><p className="eyebrow">Access, on your terms</p><h2 id="plans-heading" tabIndex={-1}>Choose an expert.<br />Review their plan.</h2><p>Each expert sets their paid plan prices. Free access and trial questions vary by expert. Review their plan before subscribing.</p><Link className="text-link" href="/login">Explore experts <span aria-hidden="true">↗</span></Link></div>
        <div className="pricing-plans">{publicPricingTiers.map(tier => <article key={tier.name}><p className="eyebrow">{tier.name}</p><h3>{tier.price} <small>{tier.period}</small></h3><p>{tier.description}</p><ul>{tier.features.map(feature => <li key={feature}>{feature}</li>)}</ul><Link className="text-link" href={tier.href}>{tier.href === "/login" ? "Explore experts" : tier.cta} <span aria-hidden="true">↗</span></Link></article>)}</div>
        <ExpertApplicationSection />
      </section>
    </main>
    <footer>
      <div className="credits"><Link href="/about">About Digital Twins</Link><p>Brain Areas by <a href="https://sketchfab.com/3d-models/brain-areas-d64608a3978b47d8a39c5a15795ca8c4">Versal</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Materials, palette, particles and camera adapted for ExpertHub.</p><p>Digital Brain by Sahil K and camera choreography adapted from JosephASG / Codrops, under MIT.</p><a href="/uploads/digital-brain-foundation/CREDITS.md">Artwork credits, licenses and modifications</a></div>
    </footer>
    </div></div>
    <noscript><style>{`[data-digital-brain-home] .brain-load-screen { display: none; } [data-digital-brain-home] [data-smooth-wrapper] { visibility: visible !important; } html, body { overflow: auto !important; } [data-digital-brain-home] .skip { display: block !important; }`}</style><p className="static-notice">The illustrated story is available above without animation. If the image cannot load, its description and the story remain available.</p></noscript>
  </div>;
}
