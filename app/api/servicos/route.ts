import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();

    const { data, error } = await supabaseServer
      .from("servicos")
      .select("id, nome, duracao_minutos, preco_centavos, ativo")
      .order("nome");

    if (error) {
      console.error("Erro ao buscar serviços", error);
      return NextResponse.json(
        { erro: "Erro ao buscar serviços." },
        { status: 500 },
      );
    }

    return NextResponse.json({ servicos: data ?? [] });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    console.error("Erro GET servicos", e);
    return NextResponse.json(
      { erro: "Erro ao buscar serviços." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as {
      nome?: string;
      duracao_minutos?: number;
      preco_centavos?: number;
    };

    if (!body.nome?.trim()) {
      return NextResponse.json(
        { erro: "Nome do serviço é obrigatório." },
        { status: 400 },
      );
    }

    const duracao = Number(body.duracao_minutos) || 30;
    const precoCentavos = Number(body.preco_centavos) || 0;

    const { data: novo, error } = await supabaseServer
      .from("servicos")
      .insert({
        nome: body.nome.trim(),
        duracao_minutos: duracao,
        preco_centavos: precoCentavos,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar serviço", error);
      return NextResponse.json(
        { erro: "Erro ao criar serviço." },
        { status: 500 },
      );
    }

    return NextResponse.json({ servico: novo }, { status: 201 });
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
    console.error("Erro POST servicos", e);
    return NextResponse.json(
      { erro: "Erro ao criar serviço." },
      { status: 500 },
    );
  }
}
