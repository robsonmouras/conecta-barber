import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { DateTime } from "luxon";

type Periodo = "dia" | "semana" | "mes" | "ano";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const periodo = (searchParams.get("periodo") ?? "mes") as Periodo;
    const dataRef = searchParams.get("data") ?? DateTime.now().toFormat("yyyy-MM-dd");

    if (!["dia", "semana", "mes", "ano"].includes(periodo)) {
      return NextResponse.json(
        { erro: "Periodo inválido. Use: dia, semana, mes ou ano." },
        { status: 400 },
      );
    }

    const dt = DateTime.fromISO(dataRef, { zone: "America/Sao_Paulo" });
    if (!dt.isValid) {
      return NextResponse.json(
        { erro: "Data inválida. Use formato yyyy-mm-dd." },
        { status: 400 },
      );
    }

    let inicio: DateTime;
    let fim: DateTime;

    switch (periodo) {
      case "dia":
        inicio = dt.startOf("day");
        fim = dt.endOf("day");
        break;
      case "semana":
        inicio = dt.startOf("week");
        fim = dt.endOf("week");
        break;
      case "mes":
        inicio = dt.startOf("month");
        fim = dt.endOf("month");
        break;
      case "ano":
        inicio = dt.startOf("year");
        fim = dt.endOf("year");
        break;
    }

    const inicioIso = inicio.toUTC().toISO();
    const fimIso = fim.toUTC().toISO();

    const { data: agendamentos, error } = await supabaseServer
      .from("agendamentos")
      .select(
        `
        id,
        servicos:servico_id (preco_centavos),
        barbeiros:barbeiro_id (id, nome)
      `,
      )
      .eq("status", "confirmado")
      .gte("data_hora_inicio", inicioIso)
      .lte("data_hora_inicio", fimIso);

    if (error) {
      console.error("Erro ao buscar relatório", error);
      return NextResponse.json(
        { erro: "Erro ao gerar relatório." },
        { status: 500 },
      );
    }

    let totalCentavos = 0;
    const porBarbeiro: Record<string, { nome: string; total_centavos: number }> = {};

    for (const ag of agendamentos ?? []) {
      const servico = Array.isArray(ag.servicos)
        ? ag.servicos[0]
        : ag.servicos;
      const barbeiro = Array.isArray(ag.barbeiros)
        ? ag.barbeiros[0]
        : ag.barbeiros;
      const valor = Number((servico as { preco_centavos?: number })?.preco_centavos ?? 0);

      totalCentavos += valor;

      const b = barbeiro as { id: string; nome: string } | undefined;
      if (b) {
        if (!porBarbeiro[b.id]) {
          porBarbeiro[b.id] = { nome: b.nome, total_centavos: 0 };
        }
        porBarbeiro[b.id].total_centavos += valor;
      }
    }

    const resumo = {
      periodo,
      data_ref: dataRef,
      inicio: inicio.toISO(),
      fim: fim.toISO(),
      total_centavos: totalCentavos,
      total_reais: (totalCentavos / 100).toFixed(2),
      quantidade_agendamentos: agendamentos?.length ?? 0,
      por_barbeiro: Object.entries(porBarbeiro).map(([id, d]) => ({
        barbeiro_id: id,
        barbeiro_nome: d.nome,
        total_centavos: d.total_centavos,
        total_reais: (d.total_centavos / 100).toFixed(2),
      })),
    };

    return NextResponse.json(resumo);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    if ((e as Error).message === "FORBIDDEN") {
      return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
    }
    console.error("Erro relatório valores", e);
    return NextResponse.json(
      { erro: "Erro ao gerar relatório." },
      { status: 500 },
    );
  }
}
