import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BancaProvider } from "@/components/providers/banca-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BetStats — Gestão de Bancas, Apostas & Analytics",
  description:
    "Sistema inteligente de gestão profissional de bancas esportivas, analytics e copy betting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BancaProvider>
            <div className="flex min-h-screen">
              {/* Desktop Sidebar */}
              <Sidebar />

              {/* Main Content Area */}
              <div className="flex flex-1 flex-col lg:pl-64 w-full">
                <Topbar />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
                  {children}
                </main>
                <BottomNav />
              </div>
            </div>
          </BancaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
