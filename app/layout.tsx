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
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F5F6F8] text-[#111827] font-sans text-xs sm:text-sm antialiased selection:bg-blue-100 selection:text-blue-900">
        <GlobalNumberInputScrollDisabler />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

