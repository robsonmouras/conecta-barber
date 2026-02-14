import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseServer } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { BARBERSHOP_TIMEZONE } from "@/lib/config/agenda";
import {
  buildDateTimeRange,
  existeConflitoAgendamento,
} from "@/lib/domain/agendamentos";

export async function GET(request: NextRequest) {
  try {
    const barbeiro = await requireAuth();
    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data");
    const barbeiroIdFiltro = searchParams.get("barbeiro_id");

    if (!data) {
      return NextResponse.json(
        { erro: "Parâmetro 'data' é obrigatório (formato: yyyy-mm-dd)." },
        { status: 400 },
      );
    }

    const inicioLocal = DateTime.fromISO(`${data}T00:00:00`, {
      zone: BARBERSHOP_TIMEZONE,
    });
    const fimLocal = DateTime.fromISO(`${data}T23:59:59.999`, {
      zone: BARBERSHOP_TIMEZONE,
    });
    const inicioDia = inicioLocal.toUTC().toISO();
    const fimDia = fimLocal.toUTC().toISO();

    // Colaborador: só sua agenda. Admin: filtro opcional por barbeiro ou todos
    const filtrarPorBarbeiro =
      barbeiro.role === "colaborador"
        ? barbeiro.barbeiroId
        : barbeiroIdFiltro ?? null;

    let query = supabaseServer
      .from("agendamentos")
      .select(
        `
        id,
        data_hora_inicio,
        data_hora_fim,
        status,
        origem,
        clientes:cliente_id (nome, whatsapp),
        barbeiros:barbeiro_id (id, nome),
        servicos:servico_id (nome, duracao_minutos, preco_centavos)
      `,
      )
      .gte("data_hora_inicio", inicioDia)
      .lte("data_hora_fim", fimDia)
      .order("data_hora_inicio", { ascending: true });

    if (filtrarPorBarbeiro) {
      query = query.eq("barbeiro_id", filtrarPorBarbeiro);
    }

    const { data: agendamentos, error } = await query;

    if (error) {
      console.error("Erro ao buscar agendamentos", error);
      return NextResponse.json(
        { erro: "Erro ao buscar agendamentos." },
        { status: 500 },
      );
    }

    return NextResponse.json({ agendamentos: agendamentos ?? [] });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    console.error("Erro GET agendamentos", e);
    return NextResponse.json(
      { erro: "Erro ao buscar agendamentos." },
      { status: 500 },
    );
  }
}

interface NovoAgendamentoBody {
  cliente_nome: string;
  cliente_whatsapp: string;
  servico_ids: string[];
  data: string;
  hora: string;
  barbeiro_id: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = (await request.json()) as Partial<NovoAgendamentoBody>;
    const {
      cliente_nome,
      cliente_whatsapp,
      servico_ids,
      data,
      hora,
      barbeiro_id,
    } = body;

    if (
      !cliente_nome?.trim() ||
      !cliente_whatsapp?.trim() ||
      !Array.isArray(servico_ids) ||
      servico_ids.length === 0 ||
      !data ||
      !hora ||
      !barbeiro_id
    ) {
      return NextResponse.json(
        {
          erro:
            "Dados incompletos. Envie: cliente_nome, cliente_whatsapp, servico_ids (array), data, hora, barbeiro_id.",
        },
        { status: 400 },
      );
    }

    const { data: servicos, error: servicosErr } = await supabaseServer
      .from("servicos")
      .select("id, nome, duracao_minutos")
      .in("id", servico_ids)
      .eq("ativo", true);

    if (servicosErr || !servicos?.length) {
      return NextResponse.json(
        { erro: "Serviços inválidos ou inativos." },
        { status: 400 },
      );
    }

    const duracaoTotal = servicos.reduce((s, v) => s + v.duracao_minutos, 0);

    const { inicio: inicioUtc, fim: fimUtc } = buildDateTimeRange(
      data,
      hora,
      duracaoTotal,
    );

    const conflito = await existeConflitoAgendamento({
      barbeiroId: barbeiro_id,
      inicioUtcIso: inicioUtc,
      fimUtcIso: fimUtc,
    });

    if (conflito) {
      return NextResponse.json(
        { erro: "Horário indisponível para o barbeiro selecionado." },
        { status: 400 },
      );
    }

    let { data: clienteExistente } = await supabaseServer
      .from("clientes")
      .select("id, nome")
      .eq("whatsapp", cliente_whatsapp.trim())
      .maybeSingle();

    let clienteId = clienteExistente?.id;

    if (!clienteId) {
      const { data: novoCliente, error: insErr } = await supabaseServer
        .from("clientes")
        .insert({
          whatsapp: cliente_whatsapp.trim(),
          nome: cliente_nome.trim(),
        })
        .select("id")
        .single();

      if (insErr || !novoCliente) {
        console.error("Erro ao criar cliente", insErr);
        return NextResponse.json(
          { erro: "Erro ao criar cliente." },
          { status: 500 },
        );
      }
      clienteId = novoCliente.id;
    } else if (!clienteExistente?.nome && cliente_nome.trim()) {
      await supabaseServer
        .from("clientes")
        .update({ nome: cliente_nome.trim() })
        .eq("id", clienteId);
    }

    const criados: { id: string; servico: string; inicio: string }[] = [];
    let horaAtual = hora;

    for (const s of servicos) {
      const { inicio, fim } = buildDateTimeRange(data, horaAtual, s.duracao_minutos);

      const { data: ag, error: agErr } = await supabaseServer
        .from("agendamentos")
        .insert({
          cliente_id: clienteId,
          barbeiro_id,
          servico_id: s.id,
          data_hora_inicio: inicio,
          data_hora_fim: fim,
          status: "confirmado",
          origem: "manual",
        })
        .select("id")
        .single();

      if (agErr || !ag) {
        console.error("Erro ao criar agendamento", agErr);
        return NextResponse.json(
          { erro: "Erro ao criar agendamento." },
          { status: 500 },
        );
      }

      criados.push({ id: ag.id, servico: s.nome, inicio });
      const [hh, mm] = horaAtual.split(":").map(Number);
      const proxMin = mm + s.duracao_minutos;
      horaAtual = `${String(hh + Math.floor(proxMin / 60)).padStart(2, "0")}:${String(proxMin % 60).padStart(2, "0")}`;
    }

    return NextResponse.json({
      ok: true,
      mensagem: `${criados.length} agendamento(s) criado(s) com sucesso.`,
      agendamentos: criados,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }
    console.error("Erro POST agendamentos", e);
    return NextResponse.json(
      { erro: "Erro ao criar agendamento." },
      { status: 500 },
    );
  }
}
