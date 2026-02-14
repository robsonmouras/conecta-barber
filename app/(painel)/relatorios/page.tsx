"use client";

import { useEffect, useState } from "react";

type Periodo = "dia" | "semana" | "mes" | "ano";

interface PorBarbeiro {
  barbeiro_id: string;
  barbeiro_nome: string;
  total_centavos: number;
  total_reais: string;
}

interface Resumo {
  periodo: Periodo;
  data_ref: string;
  total_centavos: number;
  total_reais: string;
  quantidade_agendamentos: number;
  por_barbeiro: PorBarbeiro[];
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dataRef, setDataRef] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setCarregando(true);
    setErro("");
    const url = new URL("/api/relatorios/valores", window.location.origin);
    url.searchParams.set("periodo", periodo);
    url.searchParams.set("data", dataRef);

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else setResumo(d);
      })
      .catch(() => setErro("Erro ao carregar relatório."))
      .finally(() => setCarregando(false));
  }, [periodo, dataRef]);

  const labelPeriodo: Record<Periodo, string> = {
    dia: "Dia",
    semana: "Semana",
    mes: "Mês",
    ano: "Ano",
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-800">
        Relatório de valores
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="mr-2 text-sm text-stone-600">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-800"
          >
            {(["dia", "semana", "mes", "ano"] as const).map((p) => (
              <option key={p} value={p}>
                {labelPeriodo[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm text-stone-600">Data de referência</label>
          <input
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-800"
          />
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-stone-500">Carregando…</p>
      ) : resumo ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Total (confirmados)</p>
              <p className="text-2xl font-bold text-amber-600">
                R$ {resumo.total_reais}
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Quantidade de agendamentos</p>
              <p className="text-2xl font-bold text-stone-800">
                {resumo.quantidade_agendamentos}
              </p>
            </div>
          </div>

          {resumo.por_barbeiro.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white">
              <h2 className="border-b border-stone-200 px-4 py-3 font-medium text-stone-800">
                Por barbeiro
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="px-4 py-2 font-medium text-stone-700">
                      Barbeiro
                    </th>
                    <th className="px-4 py-2 font-medium text-stone-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.por_barbeiro.map((b) => (
                    <tr
                      key={b.barbeiro_id}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="px-4 py-3">{b.barbeiro_nome}</td>
                      <td className="px-4 py-3 font-medium text-amber-600">
                        R$ {b.total_reais}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
