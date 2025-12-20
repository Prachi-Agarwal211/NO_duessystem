import "./globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
import { validateEnvironment } from "@/lib/envValidation";
import { Cinzel, Manrope } from 'next/font/google';
// Optimize font loading with next/font
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['400', '600']
});
const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
  weight: ['600', '800']
});
// Validate environment on startup (server-side only)
if (typeof window === 'undefined') {
  try {
    validateEnvironment({
      strict: process.env.NODE_ENV === 'production',
      logResults: true
    });
  } catch (error) {
    console.error('Environment validation failed:', error.message);
    // In development, allow app to start with warnings
    // In production, this would cause a crash
  }
}
export const metadata = {
  title: "JECRC UNIVERSITY NO DUES System",
  description: "Student no-dues clearance portal for JECRC University",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JECRC NO DUES"
  },
  icons: {
    icon: "/assets/logo.png",
    apple: "/assets/logo.png"
  }
};
// Use Next.js 14's generateViewport function instead of metadata
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${cinzel.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C41E3A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JECRC NO DUES" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
      </head>
      <body className="antialiased font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

