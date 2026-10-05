import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/auth/session-provider";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import "./public-launch.css";
import "./studio.css";
import { StudioMotionProvider } from "@/components/studio/motion-provider";

const dmSans = localFont({ src: "./fonts/GeistVF.woff", variable: "--font-sans", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#151411" },
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
            <StudioMotionProvider>{children}</StudioMotionProvider>
            <Toaster richColors position="top-right" />
            <PWAInstallPrompt />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
