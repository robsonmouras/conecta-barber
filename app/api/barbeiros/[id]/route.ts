import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
      email?: string;
      senha?: string;
      role?: "admin" | "colaborador";
      ativo?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = String(body.nome).trim();
    if (body.email !== undefined)
      updates.email = String(body.email).trim().toLowerCase();
    if (body.role !== undefined)
      updates.role =
        body.role === "admin" ? "admin" : "colaborador";
    if (body.ativo !== undefined) updates.ativo = Boolean(body.ativo);
    if (body.senha && body.senha.length >= 6) {
      updates.senha_hash = await bcrypt.hash(body.senha, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { erro: "Nenhum campo para atualizar." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("barbeiros")
      .update(updates)
      .eq("id", id)
      .select("id, nome, email, role, ativo")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { erro: "Já existe um barbeiro com este email." },
          { status: 400 },
        );
      }
      console.error("Erro ao atualizar barbeiro", error);
      return NextResponse.json(
        { erro: "Erro ao atualizar barbeiro." },
        { status: 500 },
      );
    }

    return NextResponse.json({ barbeiro: data });
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
    console.error("Erro PATCH barbeiro", e);
    return NextResponse.json(
      { erro: "Erro ao atualizar barbeiro." },
      { status: 500 },
    );
  }
}
