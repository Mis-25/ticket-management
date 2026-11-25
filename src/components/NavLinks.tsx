"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const LINKS = [
  { href: "/tickets", label: "Tickets", permission: null },
  { href: "/users", label: "Users", permission: "user.manage" },
  { href: "/roles", label: "Roles", permission: "user.manage" },
  { href: "/processes", label: "Processes", permission: "process.manage" },
];

export default function NavLinks() {
  const pathname = usePathname();
  const { user, can } = useAuth();

  if (!user) return null;

  return (
    <div className="app-nav">
      <nav className="app-nav-links" aria-label="Main">
        {LINKS.filter((l) => !l.permission || can(l.permission)).map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive ? "nav-link-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
