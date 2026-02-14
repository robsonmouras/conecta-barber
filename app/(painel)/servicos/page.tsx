"use client";

import { useEffect, useState } from "react";

interface Servico {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco_centavos: number;
  ativo: boolean;
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [precoReais, setPrecoReais] = useState("30.00");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/servicos")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else setServicos(d.servicos ?? []);
      })
      .catch(() => setErro("Erro ao carregar serviços."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setDuracao(30);
    setPrecoReais("30.00");
    setErroModal("");
    setModalAberto(true);
  }

  function abrirEditar(s: Servico) {
    setEditando(s);
    setNome(s.nome);
    setDuracao(s.duracao_minutos);
    setPrecoReais((s.preco_centavos / 100).toFixed(2));
    setErroModal("");
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroModal("");
    setSalvando(true);

    const precoCentavos = Math.round(parseFloat(precoReais.replace(",", ".")) * 100);

    try {
      if (editando) {
        const res = await fetch(`/api/servicos/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            duracao_minutos: duracao,
            preco_centavos: precoCentavos,
          }),
        });
        const d = await res.json();
        if (!res.ok) {
          setErroModal(d.erro ?? "Erro ao atualizar.");
          return;
        }
      } else {
        const res = await fetch("/api/servicos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            duracao_minutos: duracao,
            preco_centavos: precoCentavos,
          }),
        });
        const d = await res.json();
        if (!res.ok) {
          setErroModal(d.erro ?? "Erro ao criar.");
          return;
        }
      }

      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Serviços e valores</h1>
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          + Novo serviço
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      <p className="mb-4 text-sm text-stone-600">
        Valores médios de referência no mercado (2024-2025): Corte R$ 25-35, Barba R$ 20-30, Corte+Barba R$ 40-55.
      </p>

      {carregando ? (
        <p className="text-stone-500">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 font-medium text-stone-700">Serviço</th>
                <th className="px-4 py-3 font-medium text-stone-700">
                  Duração
                </th>
                <th className="px-4 py-3 font-medium text-stone-700">Valor</th>
                <th className="px-4 py-3 font-medium text-stone-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-stone-100 hover:bg-stone-50"
                >
                  <td className="px-4 py-3">{s.nome}</td>
                  <td className="px-4 py-3">{s.duracao_minutos} min</td>
                  <td className="px-4 py-3 font-medium text-amber-600">
                    R$ {(s.preco_centavos / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => abrirEditar(s)}
                      className="text-amber-600 hover:underline"
                    >
                      Editar
                    </button>
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
              {editando ? "Editar serviço" : "Novo serviço"}
            </h2>

            <form onSubmit={salvar} className="space-y-4">
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
                  placeholder="Corte, Barba, Corte + Barba..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value) || 30)}
                  min={5}
                  max={180}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  value={precoReais}
                  onChange={(e) => setPrecoReais(e.target.value)}
                  required
                  placeholder="30.00"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
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
                  {salvando ? "Salvando…" : editando ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
