import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const barbeiro = await requireAuth();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ erro: "ID obrigatório." }, { status: 400 });
    }

    const body = (await request.json()) as { status?: string };
    const novoStatus = body.status;

    if (!novoStatus || !["pendente", "confirmado", "cancelado"].includes(novoStatus)) {
      return NextResponse.json(
        { erro: "Status inválido. Use: pendente, confirmado ou cancelado." },
        { status: 400 },
      );
    }

    // Verificar se o agendamento existe e se o barbeiro tem permissão
    const { data: ag, error: findErr } = await supabaseServer
      .from("agendamentos")
      .select("id, barbeiro_id")
      .eq("id", id)
      .maybeSingle();

    if (findErr || !ag) {
      return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });
    }

    // Colaborador só pode editar seus próprios agendamentos
    if (barbeiro.role === "colaborador" && ag.barbeiro_id !== barbeiro.barbeiroId) {
      return NextResponse.json({ erro: "Sem permissão para editar este agendamento." }, { status: 403 });
    }

    const { data: atualizado, error } = await supabaseServer
      .from("agendamentos")
      .update({ status: novoStatus })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar agendamento", error);
      return NextResponse.json(
        { erro: "Erro ao atualizar agendamento." },
        { status: 500 },
      );
    }

    return NextResponse.json({ agendamento: atualizado });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    if ((e as Error).message === "FORBIDDEN") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }
    console.error("Erro PATCH agendamento", e);
    return NextResponse.json(
      { erro: "Erro ao atualizar agendamento." },
      { status: 500 },
    );
  }
}
