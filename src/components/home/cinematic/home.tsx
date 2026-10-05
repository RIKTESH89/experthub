import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ExpertApplicationSection } from "@/components/landing/expert-application-section";
import { publicPricingTiers } from "@/lib/public-launch-copy";
import { SequenceRuntime } from "./runtime";
import { chapterLengths } from "./timeline";
import styles from "./home.module.css";
import { assetRoot } from "./asset-config.js";
const chapterNames = ["Learn from experts", "Share your knowledge", "Explore the context", "Meet the Digital Twin", "Ask a question", "Keep it current", "Get started"];
const chapterIds = ["introduction", "contributions", "context", "construction", "conversation", "control", "close"] as const;
function Scene({ frame, caption, priority = false }: { frame: number; caption: string; priority?: boolean }) {
  const filename = `frame-${String(frame).padStart(3, "0")}.webp`;
  return <figure className="static-visual"><picture><source media="(max-width: 900px)" srcSet={`${assetRoot}assets/portrait/${filename}`} /><Image src={`${assetRoot}assets/desktop/${filename}`} alt="Brain sculpture illustrating how shared expert content informs a Digital Twin." width={1280} height={800} unoptimized priority={priority} loading={priority ? undefined : "lazy"} /></picture><figcaption>{caption}</figcaption></figure>;
}
function Chapter({ id, number, eyebrow, title, frame, caption, children, liveCaption = false }: { id: typeof chapterIds[number]; number: number; eyebrow: string; title: string; frame: number; caption: string; children: ReactNode; liveCaption?: boolean }) {
  const headingId = `title-${number}`;
  return <section className="chapter" id={id} style={{ "--length": chapterLengths[id] } as CSSProperties} aria-labelledby={headingId}><div className="panel"><div className="title-lane"><p className="eyebrow">{eyebrow}</p>{number === 1 ? <h1 id={headingId} tabIndex={-1}>{title}</h1> : <h2 id={headingId} tabIndex={-1}>{title}</h2>}</div><Scene frame={frame} caption={caption} priority={number === 1} /><div className={`body-lane${id === "conversation" ? " answer" : ""}`}>{children}</div><p className="scene-caption" data-caption={liveCaption ? "" : undefined}>{caption}</p></div></section>;
}
export function CinematicHome() {
  return <div className={styles.home} data-cinematic-home="" data-render-reason="javascript-not-initialized">
    <Link className="skip" href="#story">Skip to the story</Link>
    <header className="site-nav"><Link href="/" className="wordmark" aria-label="ExpertHub homepage">Expert<span>Hub</span><i aria-hidden="true">✳</i></Link><nav className="site-links" aria-label="Main navigation"><Link href="#plans">Pricing</Link><Link href="#apply-expert">Apply</Link><Link href="/login">Sign in</Link><ThemeToggle /><button id="motion" type="button" aria-pressed="false" disabled>Loading animation</button></nav></header>
    <div id="stage" aria-hidden="true"><Image id="stage-poster" src={`${assetRoot}assets/desktop/frame-000.webp`} alt="" width={1280} height={800} unoptimized priority /><canvas id="sequence" /><div id="live-art" hidden><canvas id="live-artwork" /></div><div className="shade" /></div>
    <p id="asset-status" className="asset-status" hidden role="status" /><noscript><p className="asset-status">Scroll animation needs JavaScript. The complete static story follows.</p></noscript>
    <nav className="chapter-nav" aria-label="Story navigation">{chapterNames.map((name, i) => <Link key={name} href={`#${chapterIds[i]}`} aria-label={name}>{name}</Link>)}</nav>
    <main id="story" tabIndex={-1}>
      <Chapter id="introduction" number={1} eyebrow="ExpertHub" title="Learn from expert Digital Twins." frame={0} caption="Expert knowledge, represented in AI.">
        <p className="lead">Read expert content and chat with an AI representation shaped by their work.</p>
        <div className="action-group"><Link className="cta primary" href="/login">Sign in to explore <span aria-hidden="true">↗</span></Link><Link className="cta secondary" href="#apply-expert">Apply as an expert <span aria-hidden="true">↗</span></Link></div>
      </Chapter>
      <Chapter id="contributions" number={2} eyebrow="Share" title="Start with what you know." frame={28} caption="01–04 / Fictional source records">
        <p>Add your posts and notes, or import text from supported PDFs and blog articles.</p><Link className="text-link" href="#source-01">Read the fictional source examples</Link>
      </Chapter>
      <Chapter id="context" number={3} eyebrow="Connect" title="Keep the context close." frame={53} caption="01 / A passage in context" liveCaption>
        <p>Relevant passages and related ideas give your twin context for a question.</p>
      </Chapter>
      <Chapter id="construction" number={4} eyebrow="Build" title="Your knowledge takes shape." frame={76} caption="A partial Digital Twin" liveCaption>
        <p>Your shared content helps shape an AI twin that people can ask questions.</p>
      </Chapter>
      <Chapter id="conversation" number={5} eyebrow="Ask" title="Ask a question. Keep learning." frame={137} caption="Fictional conversation · not live AI" liveCaption>
        <p>Ask follow-ups and check available sources behind the answers.</p><Link className="text-link" href="#sample-conversation">Read the fictional conversation · scripted, not live</Link>
      </Chapter>
      <Chapter id="control" number={6} eyebrow="Maintain" title="Keep your knowledge up to date." frame={151} caption="Shared sources remain distinct">
        <p>Add new material and correct your notes as your work and thinking change.</p>
      </Chapter>
      <Chapter id="close" number={7} eyebrow="Explore" title="Find your next conversation." frame={172} caption="Start exploring">
        <p className="lead">Choose an expert to learn from, or apply to share your own expertise.</p><div className="action-group"><Link className="cta primary" href="/login">Sign in to explore <span aria-hidden="true">↗</span></Link><Link className="cta secondary" href="#apply-expert">Apply as an expert <span aria-hidden="true">↗</span></Link></div>
      </Chapter>
    </main>
    <div className="story-release" aria-hidden="true" />
    <section className="product-continuation" id="plans" aria-labelledby="plans-heading"><div className="section-heading"><p className="eyebrow">Access, on your terms</p><h2 id="plans-heading" tabIndex={-1}>Choose an expert. Review their plan.</h2><p>Each expert sets their paid plan prices. Free access and trial questions vary by expert. Review their plan before subscribing.</p><Link className="text-link" href="/pricing">Access and pricing details</Link></div><div className="pricing-plans">{publicPricingTiers.map(tier => <article key={tier.name}><p className="index">{tier.name}</p><h3>{tier.price} <small>{tier.period}</small></h3><p>{tier.description}</p><ul>{tier.features.map(feature => <li key={feature}>{feature}</li>)}</ul><Link className="text-link" href={tier.href}>{tier.href === "/login" ? "Sign in to explore" : tier.cta}</Link></article>)}</div><ExpertApplicationSection /></section>
    <footer id="limits"><div><p className="eyebrow">Sources, context and limits</p><h2>AI conversations. Human judgment.</h2><p>Digital Twins are AI representations of experts. Answers can be wrong, incomplete or differ from the expert’s current views. Check available sources and contact the expert when you need their own judgment.</p><p>The sculpture illustrates shared knowledge; it is not a brain scan or access to private memories. All source records and the conversation shown here are fictional. Citations help you check a response, but do not guarantee accuracy.</p><p id="runtime-status" role="status">The complete story is available in text.</p><details><summary>Read the fictional conversation · scripted, not live AI</summary><div id="sample-conversation" tabIndex={-1}><p className="index">The question</p><p>How should I begin choosing an option?</p><p className="index">The scripted answer</p><blockquote>Begin with a clear question. Compare the available options against the stated constraint.</blockquote><p className="index">Example sources</p><p><Link href="#source-01">01 / Context note</Link></p><p><Link href="#source-04">04 / Compare options</Link></p></div></details><details><summary>Read the fictional source records</summary><div id="source-01" tabIndex={-1}><h3>01 / Context note</h3><p>Begin with a clear question. Keep its context in view.</p></div><div id="source-02"><h3>02 / Question, context, decision</h3><p>Question → Context → Decision</p></div><div id="source-03"><h3>03 / A constraint in an example</h3><p>Illustrative case note: after naming the constraint, the example’s next step changed.</p></div><div id="source-04" tabIndex={-1}><h3>04 / Compare options</h3><p>Compare the available options against the stated constraint.</p></div></details></div><div className="credit"><Link href="/about">About Digital Twins</Link><p>BodyParts3D, © The Database Center for Life Science, licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC Attribution 4.0 International</a>.</p><p>Modified for this sculpture: seam welding, normals, scale, studio materials, paper slicing, sparse layer assembly, leaf deformation and motion. No endorsement implied.</p><a href={`${assetRoot}ATTRIBUTION.md`}>Anatomical illustration attribution</a></div></footer><SequenceRuntime />
  </div>;
}
