"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "./LogoutButton";

export function NavBar() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.barbeiro?.role ?? null));
  }, []);

  return (
    <nav className="flex items-center gap-4">
      <Link
        href="/agenda"
        className="text-sm font-medium text-[#333333] hover:text-primary"
      >
        Agenda
      </Link>
      {role === "admin" && (
        <>
          <Link
            href="/barbeiros"
            className="text-sm font-medium text-[#333333] hover:text-primary"
          >
            Barbeiros
          </Link>
          <Link
            href="/servicos"
            className="text-sm font-medium text-[#333333] hover:text-primary"
          >
            Serviços
          </Link>
          <Link
            href="/relatorios"
            className="text-sm font-medium text-[#333333] hover:text-primary"
          >
            Relatórios
          </Link>
        </>
      )}
      <LogoutButton />
    </nav>
  );
}
