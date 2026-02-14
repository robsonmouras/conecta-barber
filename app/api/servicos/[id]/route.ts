import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ erro: "ID obrigatório." }, { status: 400 });
    }

    const body = (await request.json()) as {
      nome?: string;
      duracao_minutos?: number;
      preco_centavos?: number;
      ativo?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = String(body.nome).trim();
    if (body.duracao_minutos !== undefined)
      updates.duracao_minutos = Number(body.duracao_minutos) || 30;
    if (body.preco_centavos !== undefined)
      updates.preco_centavos = Number(body.preco_centavos) || 0;
    if (body.ativo !== undefined) updates.ativo = Boolean(body.ativo);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { erro: "Nenhum campo para atualizar." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("servicos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar serviço", error);
      return NextResponse.json(
        { erro: "Erro ao atualizar serviço." },
        { status: 500 },
      );
    }

    return NextResponse.json({ servico: data });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    if ((e as Error).message === "FORBIDDEN") {
      return NextResponse.json(
        { erro: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }
    console.error("Erro PATCH servico", e);
    return NextResponse.json(
      { erro: "Erro ao atualizar serviço." },
      { status: 500 },
    );
  }
}
