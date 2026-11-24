import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helpdesk Ticket Management System",
  description: "Create, assign, track and resolve helpdesk tickets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header className="app-header">
            <div className="app-header-inner">
              <h1 className="app-logo">HELPDESK</h1>
              <p className="app-logo-sub">Ticket Management System</p>
              <Suspense fallback={null}>
                <NavLinks />
              </Suspense>
            </div>
          </header>

          <main className="app-main">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
