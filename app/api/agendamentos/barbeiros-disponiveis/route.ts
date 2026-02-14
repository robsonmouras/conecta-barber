import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { existeConflitoAgendamento, buildDateTimeRange } from "@/lib/domain/agendamentos";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data");
    const hora = searchParams.get("hora");
    const duracaoMinutos = Number(searchParams.get("duracao_minutos"));

    if (!data || !hora || !duracaoMinutos || duracaoMinutos < 1) {
      return NextResponse.json(
        { erro: "Parâmetros obrigatórios: data, hora, duracao_minutos." },
        { status: 400 },
      );
    }

    const { inicio, fim } = buildDateTimeRange(data, hora, duracaoMinutos);

    const { data: barbeiros, error: barbeirosErr } = await supabaseServer
      .from("barbeiros")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");

    if (barbeirosErr) {
      console.error("Erro ao buscar barbeiros", barbeirosErr);
      return NextResponse.json(
        { erro: "Erro ao buscar barbeiros." },
        { status: 500 },
      );
    }

    const disponiveis: { id: string; nome: string }[] = [];

    for (const b of barbeiros ?? []) {
      const conflito = await existeConflitoAgendamento({
        barbeiroId: b.id,
        inicioUtcIso: inicio,
        fimUtcIso: fim,
      });
      if (!conflito) {
        disponiveis.push(b);
      }
    }

    return NextResponse.json({ barbeiros: disponiveis });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    console.error("Erro barbeiros-disponiveis", e);
    return NextResponse.json(
      { erro: "Erro ao buscar barbeiros disponíveis." },
      { status: 500 },
    );
  }
}
