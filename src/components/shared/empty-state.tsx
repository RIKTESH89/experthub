import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-auto" aria-hidden="true">
      {/* Background soft shape */}
      <ellipse cx="100" cy="90" rx="85" ry="40" fill="#f5f3ff" />
      {/* Empty folder */}
      <rect x="55" y="40" width="90" height="65" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
      {/* Folder tab */}
      <path d="M55 46c0-3.3 2.7-6 6-6h25l6 8h47c3.3 0 6 2.7 6 6v-8H55z" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="2" />
      {/* Empty lines inside folder */}
      <line x1="72" y1="62" x2="128" y2="62" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="72" y1="72" x2="120" y2="72" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="72" y1="82" x2="112" y2="82" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      {/* Sparkle top-right */}
      <path d="M148 30l3-6 3 6-6 3 6 3-3 6-3-6-6-3z" fill="#6366f1" opacity="0.5" />
      {/* Sparkle top-left */}
      <path d="M48 25l2-4 2 4-4 2 4 2-2 4-2-4-4-2z" fill="#8b5cf6" opacity="0.4" />
      {/* Small sparkle */}
      <path d="M160 60l1.5-3 1.5 3-3 1.5 3 1.5-1.5 3-1.5-3-3-1.5z" fill="#6366f1" opacity="0.35" />
      {/* Decorative dots */}
      <circle cx="38" cy="70" r="3" fill="#ddd6fe" />
      <circle cx="168" cy="80" r="2.5" fill="#ddd6fe" />
      <circle cx="45" cy="100" r="2" fill="#ddd6fe" />
      <circle cx="158" cy="100" r="2" fill="#ddd6fe" />
      {/* Subtle search/magnifier hint */}
      <circle cx="155" cy="42" r="8" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.3" />
      <line x1="161" y1="48" x2="166" y2="53" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
      {/* SVG Illustration */}
      <EmptyIllustration />
      {/* Icon overlay */}
      <div className="-mt-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border shadow-sm">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
