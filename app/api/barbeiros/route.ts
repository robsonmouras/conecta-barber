import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const { data, error } = await supabaseServer
      .from("barbeiros")
      .select("id, nome, ativo, role, email")
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar barbeiros", error);
      return NextResponse.json(
        { erro: "Erro ao buscar barbeiros." },
        { status: 500 },
      );
    }

    return NextResponse.json({ barbeiros: data ?? [] });
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
    console.error("Erro GET barbeiros", e);
    return NextResponse.json(
      { erro: "Erro ao buscar barbeiros." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as {
      nome?: string;
      email?: string;
      senha?: string;
      role?: "admin" | "colaborador";
    };

    if (!body.nome?.trim()) {
      return NextResponse.json(
        { erro: "Nome do barbeiro é obrigatório." },
        { status: 400 },
      );
    }

    if (!body.email?.trim()) {
      return NextResponse.json(
        { erro: "Email é obrigatório para login." },
        { status: 400 },
      );
    }

    if (!body.senha || body.senha.length < 6) {
      return NextResponse.json(
        { erro: "Senha deve ter no mínimo 6 caracteres." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const senhaHash = await bcrypt.hash(body.senha, 10);
    const role = body.role === "admin" ? "admin" : "colaborador";

    const { data: novo, error } = await supabaseServer
      .from("barbeiros")
      .insert({
        nome: body.nome.trim(),
        email,
        senha_hash: senhaHash,
        role,
        ativo: true,
      })
      .select("id, nome, email, role")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { erro: "Já existe um barbeiro com este email." },
          { status: 400 },
        );
      }
      console.error("Erro ao criar barbeiro", error);
      return NextResponse.json(
        { erro: "Erro ao criar barbeiro." },
        { status: 500 },
      );
    }

    return NextResponse.json({ barbeiro: novo }, { status: 201 });
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
    console.error("Erro POST barbeiros", e);
    return NextResponse.json(
      { erro: "Erro ao criar barbeiro." },
      { status: 500 },
    );
  }
}
