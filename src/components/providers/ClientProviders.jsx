'use client';

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import GlobalBackground from "@/components/ui/GlobalBackground";

export default function ClientProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
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
      </AuthProvider>
    </ThemeProvider>
  );
}