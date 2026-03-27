import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/auth/session-provider";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export function generateMetadata(): Metadata {
  return {
    title: "ExpertHub - Connect with Expert Digital Twins",
    description:
      "Connect with experts, access their digital twins powered by AI, and learn from the best minds in any field.",
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dmSerif.variable} font-sans`}
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
