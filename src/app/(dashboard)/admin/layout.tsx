import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Admin Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/admin"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
      </nav>

      {children}
    </div>
  );
}
