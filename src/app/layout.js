import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { validateEnvironment } from "@/lib/envValidation";
import { Toaster } from "react-hot-toast";
import GlobalBackground from "@/components/ui/GlobalBackground";

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
  title: "JECRC No Dues System",
  description: "Student no-dues clearance portal for JECRC University",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JECRC No Dues"
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C41E3A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JECRC No Dues" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          {/* Global Fixed Background - stays fixed across all pages */}
          <GlobalBackground />
          
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-black dark:text-white dark:border dark:border-white/20',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#00FF88',
                  secondary: 'black',
                },
              },
            }}
          />
          
          {/* Content container - scrollable above background */}
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
