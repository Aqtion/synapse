import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { UserProvider } from "@/contexts/UserContext";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DARK_MODE_COOKIE } from "@/contexts/theme";
import { getToken } from "@/lib/auth-server";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synapse",
  description: "Synapse",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const darkMode = cookieStore.get(DARK_MODE_COOKIE)?.value;
  const initialTheme = darkMode === "dark" ? "dark" : "light";
  let initialToken: string | null = null;
  const hasSessionCookie = cookieStore.getAll().some((c) => c.name.includes("session"));
  if (hasSessionCookie) {
    try {
      initialToken = (await getToken()) ?? null;
    } catch {
      // 401 / connection error: render without auth
    }
  }

  return (
    <html lang="en" className={initialTheme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider initialTheme={initialTheme}>
          <ConvexClientProvider initialToken={initialToken}>
            <UserProvider>
              <TooltipProvider>
                <Header />
                {children}
                <Toaster />
              </TooltipProvider>
            </UserProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
