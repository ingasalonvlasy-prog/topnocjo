"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/ucet", label: "Přehled" },
  { href: "/ucet/objednavky", label: "Objednávky" },
  { href: "/ucet/oblibene", label: "Oblíbené" },
  { href: "/ucet/udaje", label: "Údaje a adresa" },
];

export function AccountNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/ucet") return pathname === "/ucet";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex lg:flex-col gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-4 py-2.5 text-[14px] font-medium rounded-[var(--radius-field)] transition-colors ${
            isActive(link.href)
              ? "bg-navy text-white"
              : "text-ink hover:bg-wash"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <form action="/ucet/odhlasit" method="POST">
        <button
          type="submit"
          className="w-full text-left px-4 py-2.5 text-[14px] font-medium rounded-[var(--radius-field)] text-sale hover:bg-red-50 transition-colors"
        >
          Odhlásit se
        </button>
      </form>
    </nav>
  );
}
