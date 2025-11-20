import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { validateEnvironment } from "@/lib/envValidation";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
