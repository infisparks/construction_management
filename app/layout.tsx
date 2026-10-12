import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

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
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans text-xs sm:text-sm font-light">
        <GlobalNumberInputScrollDisabler />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
