import Image from "next/image";
import Link from "next/link";
import { NavBar } from "./components/NavBar";

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/agenda" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Zaply" width={200} height={56} priority className="h-18 w-auto" />
          </Link>
          <NavBar />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
