import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/app/actions/auth";
import { Providers } from "@/components/Providers";
import { ThemeToggle } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Control de Finanzas Personales",
  description: "Gestión personal de ingresos, egresos y deudas",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession()
  const userEmail = session?.email ?? null

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-100 dark:bg-zinc-950">
        <Providers>
          {userEmail && (
            <div className="flex items-center justify-end gap-1 px-4 py-1 bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <span className="mr-auto truncate max-w-[200px] text-xs text-zinc-400 dark:text-zinc-500">{userEmail}</span>
              <ThemeToggle />
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
          {children}
        </Providers>
      </body>
    </html>
  );
}
