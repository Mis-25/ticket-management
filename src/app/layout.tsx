import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helpdesk Ticket Management System",
  description: "Create, view and close helpdesk tickets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
              H
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Helpdesk</h1>
              <p className="text-xs text-slate-500">Ticket Management System</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}