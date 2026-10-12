import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noori Crest | Construction Planning & Site Execution",
  description: "Enterprise multi-storey building construction schedule, critical path management, and daily progress reporting system.",
};

import { AuthProvider } from "@/lib/supabase/auth-context";
import { GlobalNumberInputScrollDisabler } from "@/components/common/GlobalNumberInputScrollDisabler";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans text-xs sm:text-sm font-light">
        <GlobalNumberInputScrollDisabler />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

