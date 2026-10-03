import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/auth/session-provider";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import "./public-launch.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export function generateMetadata(): Metadata {
  return {
    title: "ExpertHub - Connect with Expert Digital Twins",
    description:
      "Explore expert-provided content and AI-generated conversations. Digital Twins are AI representations and can be inaccurate.",
    robots: { index: false, follow: false },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "ExpertHub",
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: "/icons/icon-192x192.svg",
      apple: "/icons/icon-192x192.svg",
    },
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d17" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} font-sans`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
            <PWAInstallPrompt />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
