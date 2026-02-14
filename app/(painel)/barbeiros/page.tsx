"use client";

import { useEffect, useState } from "react";

interface Barbeiro {
  id: string;
  nome: string;
  email?: string;
  role?: string;
  ativo?: boolean;
}

export default function BarbeirosPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "colaborador">("colaborador");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/barbeiros")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else setBarbeiros(d.barbeiros ?? []);
      })
      .catch(() => setErro("Erro ao carregar barbeiros."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarBarbeiro(e: React.FormEvent) {
    e.preventDefault();
    setErroModal("");
    setSalvando(true);

    try {
      const res = await fetch("/api/barbeiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha,
          role,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setErroModal(d.erro ?? "Erro ao criar barbeiro.");
        return;
      }

      setModalAberto(false);
      setNome("");
      setEmail("");
      setSenha("");
      setRole("colaborador");
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Barbeiros</h1>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          + Novo barbeiro
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-stone-500">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 font-medium text-stone-700">Nome</th>
                <th className="px-4 py-3 font-medium text-stone-700">Email</th>
                <th className="px-4 py-3 font-medium text-stone-700">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {barbeiros.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-stone-100 hover:bg-stone-50"
                >
                  <td className="px-4 py-3">{b.nome}</td>
                  <td className="px-4 py-3">{b.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline rounded px-2 py-0.5 text-xs font-medium ${
                        b.role === "admin"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {b.role === "admin" ? "Admin" : "Colaborador"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-stone-800">
              Novo barbeiro
            </h2>

            <form onSubmit={criarBarbeiro} className="space-y-4 text-stone-800">
              {erroModal && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {erroModal}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="João"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Email (para login)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="joao@barbearia.com"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Senha (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Perfil
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "colaborador")
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {salvando ? "Salvando…" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
