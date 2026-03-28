import Link from "next/link";

const footerLinks = [
  { title: "About", href: "/about" },
  { title: "Pricing", href: "/pricing" },
  { title: "Terms", href: "/terms" },
  { title: "Contact", href: "/contact" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-sans">ExpertHub</span>
          </div>
          <nav className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="cursor-pointer text-sm font-sans text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {link.title}
              </Link>
            ))}
          </nav>
          <p className="text-sm font-sans text-muted-foreground">
            &copy; {currentYear} ExpertHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
