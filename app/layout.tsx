import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/app/actions/auth";
import { Providers } from "@/components/Providers";

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
  // Best-effort auth check — layout renders for both / and /login.
  // If no session, user is null and we render nothing in the auth bar.
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
            <div className="flex items-center justify-end gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500">
              <span className="truncate max-w-[180px] inline-block">{userEmail}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded px-2 py-1 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
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
