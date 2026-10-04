import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
export function StudioPublicShell({children}:{children:React.ReactNode}) {
  return <div className="studio-home"><a className="studio-skip" href="#main-content">Skip to content</a><header className="studio-nav"><Link href="/" className="studio-brand"><span aria-hidden="true">e.</span>ExpertHub</Link><nav aria-label="Main navigation"><Link href="/about">Our approach</Link><Link href="/pricing">Pricing</Link><ThemeToggle/><Link className="studio-link" href="/login">Sign in<ArrowRight size={16}/></Link></nav></header><main id="main-content" tabIndex={-1}>{children}</main><footer className="studio-footer"><Link href="/" className="studio-brand">ExpertHub</Link><p>Expert content. AI conversations. Your judgment.</p><nav aria-label="Footer"><Link href="/about">About</Link><Link href="/pricing">Pricing</Link><Link href="/login">Sign in</Link></nav></footer></div>;
}
