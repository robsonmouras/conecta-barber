"use client";

import { useEffect, useState } from "react";

interface Barbeiro {
  id: string;
  nome: string;
}

interface ServicoCompleto {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco_centavos: number;
}

interface Cliente {
  nome: string | null;
  whatsapp: string;
}

interface Servico {
  nome: string;
  preco_centavos: number;
}

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: string;
  origem: string | null;
  clientes: Cliente | Cliente[] | null;
  barbeiros: { id: string; nome: string } | { id: string; nome: string }[] | null;
  servicos: Servico | Servico[] | null;
}

function extrair<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

const SLOTS_HORA = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];

export default function AgendaPage() {
  const [data, setData] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [barbeiroFiltro, setBarbeiroFiltro] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [usuarioAdmin, setUsuarioAdmin] = useState(false);
  const [barbeiroIdSessao, setBarbeiroIdSessao] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [servicos, setServicos] = useState<ServicoCompleto[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [dataNovo, setDataNovo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [horaNovo, setHoraNovo] = useState("09:00");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [barbeirosDisponiveis, setBarbeirosDisponiveis] = useState<Barbeiro[]>([]);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUsuarioAdmin(d.barbeiro?.role === "admin");
        setBarbeiroIdSessao(d.barbeiro?.barbeiroId ?? "");
      });
  }, []);

  useEffect(() => {
    if (!usuarioAdmin) return;
    fetch("/api/barbeiros")
      .then((r) => r.json())
      .then((d) => setBarbeiros(d.barbeiros ?? []));
  }, [usuarioAdmin]);

  useEffect(() => {
    setCarregando(true);
    setErro("");
    const url = new URL("/api/agendamentos", window.location.origin);
    url.searchParams.set("data", data);
    if (barbeiroFiltro) url.searchParams.set("barbeiro_id", barbeiroFiltro);

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else setAgendamentos(d.agendamentos ?? []);
      })
      .catch(() => setErro("Erro ao carregar agenda."))
      .finally(() => setCarregando(false));
  }, [data, barbeiroFiltro]);

  useEffect(() => {
    fetch("/api/servicos")
      .then((r) => r.json())
      .then((d) => setServicos(d.servicos ?? []));
  }, []);

  useEffect(() => {
    if (!modalAberto || servicosSelecionados.length === 0) {
      setBarbeirosDisponiveis([]);
      setBarbeiroSelecionado("");
      return;
    }
    const duracao = servicos
      .filter((s) => servicosSelecionados.includes(s.id))
      .reduce((acc, s) => acc + s.duracao_minutos, 0);

    const url = new URL(
      "/api/agendamentos/barbeiros-disponiveis",
      window.location.origin,
    );
    url.searchParams.set("data", dataNovo);
    url.searchParams.set("hora", horaNovo);
    url.searchParams.set("duracao_minutos", String(duracao));

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setBarbeirosDisponiveis(d.barbeiros ?? []);
        setBarbeiroSelecionado("");
      });
  }, [modalAberto, dataNovo, horaNovo, servicosSelecionados, servicos]);

  function toggleServico(id: string) {
    setServicosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const servicosSel = servicos.filter((s) => servicosSelecionados.includes(s.id));
  const duracaoTotal = servicosSel.reduce((a, s) => a + s.duracao_minutos, 0);
  const precoTotalCentavos = servicosSel.reduce(
    (a, s) => a + s.preco_centavos,
    0,
  );

  async function criarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    setErroModal("");
    setSalvando(true);

    const barbeiroId = usuarioAdmin ? barbeiroSelecionado : barbeiroIdSessao;
    if (!barbeiroId) {
      setErroModal("Selecione um barbeiro.");
      setSalvando(false);
      return;
    }

    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nome: clienteNome.trim(),
          cliente_whatsapp: clienteWhatsapp.trim(),
          servico_ids: servicosSelecionados,
          data: dataNovo,
          hora: horaNovo,
          barbeiro_id: barbeiroId,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setErroModal(d.erro ?? "Erro ao criar agendamento.");
        return;
      }

      setModalAberto(false);
      setClienteNome("");
      setClienteWhatsapp("");
      setServicosSelecionados([]);
      setDataNovo(new Date().toISOString().slice(0, 10));
      setHoraNovo("09:00");

      const url = new URL("/api/agendamentos", window.location.origin);
      url.searchParams.set("data", data);
      if (barbeiroFiltro) url.searchParams.set("barbeiro_id", barbeiroFiltro);
      const r = await fetch(url);
      const dataRes = await r.json();
      if (dataRes.agendamentos) setAgendamentos(dataRes.agendamentos);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(id: string, novoStatus: string) {
    const res = await fetch(`/api/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (res.ok) {
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a)),
      );
    }
  }

  function formatarHora(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#333333]" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>Agenda do dia</h1>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="btn-primary rounded-xl px-4 py-2 text-sm font-medium text-white"
        >
          + Novo agendamento
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="text-stone-800">
          <label className="mr-2 text-sm text-stone-600">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-800"
          />
        </div>
        {usuarioAdmin && (
          <div>
            <label className="mr-2 text-sm text-stone-600">Barbeiro</label>
            <select
              value={barbeiroFiltro}
              onChange={(e) => setBarbeiroFiltro(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-800"
            >
              <option value="">Todos</option>
              {barbeiros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-stone-500">Carregando…</p>
      ) : agendamentos.length === 0 ? (
        <p className="rounded-lg bg-stone-100 px-4 py-6 text-center text-stone-600">
          Nenhum agendamento neste dia.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm text-stone-800">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 font-medium text-stone-700">Horário</th>
                {usuarioAdmin && !barbeiroFiltro && (
                  <th className="px-4 py-3 font-medium text-stone-700">
                    Barbeiro
                  </th>
                )}
                <th className="px-4 py-3 font-medium text-stone-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-stone-700">WhatsApp</th>
                <th className="px-4 py-3 font-medium text-stone-700">Serviço</th>
                <th className="px-4 py-3 font-medium text-stone-700">Status</th>
                <th className="px-4 py-3 font-medium text-stone-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((ag) => {
                const cliente = extrair(ag.clientes);
                const barbeiro = extrair(ag.barbeiros);
                const servico = extrair(ag.servicos);
                return (
                  <tr
                    key={ag.id}
                    className="border-b border-stone-100 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      {formatarHora(ag.data_hora_inicio)} –{" "}
                      {formatarHora(ag.data_hora_fim)}
                    </td>
                    {usuarioAdmin && !barbeiroFiltro && (
                      <td className="px-4 py-3">
                        {barbeiro?.nome ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">{cliente?.nome ?? "—"}</td>
                    <td className="px-4 py-3">{cliente?.whatsapp ?? "—"}</td>
                    <td className="px-4 py-3">{servico?.nome ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline rounded px-2 py-0.5 text-xs font-medium ${
                          ag.status === "confirmado"
                            ? "bg-primary-light text-primary-dark"
                            : ag.status === "cancelado"
                              ? "bg-red-100 text-red-800"
                              : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {ag.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ag.status !== "cancelado" && (
                        <div className="flex gap-1">
                          {ag.status !== "confirmado" && (
                            <button
                              type="button"
                              onClick={() =>
                                alterarStatus(ag.id, "confirmado")
                              }
                              className="btn-primary rounded-lg px-2 py-1 text-xs text-white"
                            >
                              Confirmar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => alterarStatus(ag.id, "cancelado")}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-stone-800">
              Novo agendamento
            </h2>

            <form onSubmit={criarAgendamento} className="space-y-4 text-stone-800">
              {erroModal && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {erroModal}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Data
                </label>
                <input
                  type="date"
                  value={dataNovo}
                  onChange={(e) => setDataNovo(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Horário
                </label>
                <select
                  value={horaNovo}
                  onChange={(e) => setHoraNovo(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {SLOTS_HORA.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Serviços (pode escolher mais de um)
                </label>
                <div className="space-y-2">
                  {servicos.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded border border-stone-200 p-2 hover:bg-stone-50"
                    >
                      <input
                        type="checkbox"
                        checked={servicosSelecionados.includes(s.id)}
                        onChange={() => toggleServico(s.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1">{s.nome}</span>
                      <span className="text-sm text-stone-500">
                        {s.duracao_minutos} min
                      </span>
                      <span className="font-medium text-primary-dark">
                        R$ {(s.preco_centavos / 100).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
                {servicosSel.length > 0 && (
                  <p className="mt-2 text-sm text-stone-600">
                    Total: {duracaoTotal} min · R${" "}
                    {(precoTotalCentavos / 100).toFixed(2)}
                  </p>
                )}
              </div>

              {servicosSelecionados.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Barbeiro disponível
                  </label>
                  {usuarioAdmin ? (
                    <select
                      value={barbeiroSelecionado}
                      onChange={(e) => setBarbeiroSelecionado(e.target.value)}
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    >
                      <option value="">
                        {barbeirosDisponiveis.length === 0
                          ? "Carregando…"
                          : "Selecione"}
                      </option>
                      {barbeirosDisponiveis.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-stone-600">
                      Você será o barbeiro deste agendamento
                      {barbeirosDisponiveis.some(
                        (b) => b.id === barbeiroIdSessao,
                      )
                        ? " ✓ Disponível"
                        : " — Horário indisponível"}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Nome do cliente
                </label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                  placeholder="João Silva"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(e.target.value)}
                  required
                  placeholder="+5511999990000"
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
                  disabled={
                    salvando ||
                    servicosSelecionados.length === 0 ||
                    (usuarioAdmin && !barbeiroSelecionado)
                  }
                  className="btn-primary flex-1 rounded-xl px-4 py-2 font-medium text-white disabled:opacity-60"
                >
                  {salvando ? "Salvando…" : "Agendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
