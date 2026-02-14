import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha } = body as { email?: string; senha?: string };

    if (!email || !senha) {
      return NextResponse.json(
        { erro: "Email e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const { data: barbeiro, error } = await supabaseServer
      .from("barbeiros")
      .select("id, nome, email, senha_hash, role, ativo")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar barbeiro", error);
      return NextResponse.json(
        { erro: "Erro ao autenticar. Tente novamente." },
        { status: 500 },
      );
    }

    if (!barbeiro || !barbeiro.senha_hash || !barbeiro.ativo) {
      return NextResponse.json(
        { erro: "Email ou senha inválidos." },
        { status: 401 },
      );
    }

    const senhaValida = await bcrypt.compare(senha, barbeiro.senha_hash);
    if (!senhaValida) {
      return NextResponse.json(
        { erro: "Email ou senha inválidos." },
        { status: 401 },
      );
    }

    const session = await getSession();
    session.barbeiro = {
      barbeiroId: barbeiro.id,
      barbeiroNome: barbeiro.nome,
      role: barbeiro.role ?? "colaborador",
    };
    await session.save();

    return NextResponse.json({
      ok: true,
      barbeiro: {
        id: barbeiro.id,
        nome: barbeiro.nome,
        role: barbeiro.role,
      },
    });
  } catch (e) {
    console.error("Erro no login", e);
    return NextResponse.json(
      { erro: "Erro ao autenticar. Tente novamente." },
      { status: 500 },
    );
  }
}
