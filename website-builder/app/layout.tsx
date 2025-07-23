import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout";
import { AdminAuthProvider } from "@/contexts/admin-auth-context";
import { AdminProtectedRoute } from "@/components/auth/admin-protected-route";
import { validateEnvironmentVariables } from "@/lib/utils/envUtils";
import logger from '@/lib/logger';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Website Builder - Loctelli",
  description: "AI-powered website editor for quick modifications and prototyping",
};

// Validate environment variables on startup
validateEnvironmentVariables();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AdminAuthProvider>
            <AdminProtectedRoute>
              {children}
            </AdminProtectedRoute>
            <Toaster />
          </AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
