import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { validateEnvironment } from "@/lib/envValidation";
import { Toaster } from "react-hot-toast";

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
};

// Use Next.js 14's generateViewport function instead of metadata
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider>
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
