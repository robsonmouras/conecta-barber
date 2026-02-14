import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import {
  type SendbotHorariosDisponiveisPayload,
  type SendbotHorariosDisponiveisResponse,
} from "@/lib/domain/types";
import { buildDateTimeRange, gerarSlotsDoDia } from "@/lib/domain/agendamentos";

// Janela de trabalho padrão (pode evoluir para vir do banco)
const EXPEDIENTE_INICIO = "09:00";
const EXPEDIENTE_FIM = "18:00";

export async function POST(request: NextRequest): 
Promise<NextResponse<SendbotHorariosDisponiveisResponse>> {
  try {
    const body =
      (await request.json()) as Partial<SendbotHorariosDisponiveisPayload>;

    if (!body.data || !body.barbeiro_nome || !body.servico_nome) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem:
            "Dados incompletos. Envie data, barbeiro_nome e servico_nome.",
        },
        { status: 400 },
      );
    }

    const payload: SendbotHorariosDisponiveisPayload = {
      data: body.data,
      barbeiro_nome: body.barbeiro_nome,
      servico_nome: body.servico_nome,
    };

    // 1) Buscar barbeiro
    const { data: barbeiro, error: barbeiroError } = await supabaseServer
      .from("barbeiros")
      .select("*")
      .eq("nome", payload.barbeiro_nome)
      .eq("ativo", true)
      .maybeSingle();

    if (barbeiroError) {
      console.error("Erro ao buscar barbeiro", barbeiroError);
      return erroInterno();
    }

    if (!barbeiro) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Barbeiro não encontrado ou inativo.",
        },
        { status: 404 },
      );
    }

    // 2) Buscar serviço
    const { data: servico, error: servicoError } = await supabaseServer
      .from("servicos")
      .select("*")
      .eq("nome", payload.servico_nome)
      .eq("ativo", true)
      .maybeSingle();

    if (servicoError) {
      console.error("Erro ao buscar serviço", servicoError);
      return erroInterno();
    }

    if (!servico) {
      return NextResponse.json(
        {
          status: "erro",
          mensagem: "Serviço não encontrado ou inativo.",
        },
        { status: 404 },
      );
    }

    // 3) Gerar todos os slots possíveis no dia
    const todosSlots = gerarSlotsDoDia({
      data: payload.data,
      inicioExpediente: EXPEDIENTE_INICIO,
      fimExpediente: EXPEDIENTE_FIM,
      duracaoMinutos: servico.duracao_minutos,
    });

    if (todosSlots.length === 0) {
      return NextResponse.json(
        {
          status: "ok",
          horarios_disponiveis: [],
          mensagem: "Nenhum horário disponível neste dia.",
        },
        { status: 200 },
      );
    }

    // 4) Buscar agendamentos existentes nesse dia para o barbeiro
    const { data: agendamentos, error: agendamentosError } =
      await supabaseServer
        .from("agendamentos")
        .select("data_hora_inicio, data_hora_fim")
        .eq("barbeiro_id", barbeiro.id)
        .neq("status", "cancelado")
        .gte("data_hora_inicio", `${payload.data}T00:00:00Z`)
        .lte("data_hora_fim", `${payload.data}T23:59:59Z`);

    if (agendamentosError) {
      console.error("Erro ao buscar agendamentos do dia", agendamentosError);
      return erroInterno();
    }

    // 5) Filtrar slots que conflitam
    const slotsLivres = todosSlots.filter((hora) => {
      const { inicio, fim } = buildDateTimeRange(
        payload.data,
        hora,
        servico.duracao_minutos,
      );

      const conflita = agendamentos?.some((ag) => {
        return inicio < ag.data_hora_fim && fim > ag.data_hora_inicio;
      });

      return !conflita;
    });

    return NextResponse.json(
      {
        status: "ok",
        horarios_disponiveis: slotsLivres,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("Erro inesperado em horarios-disponiveis", e);
    return erroInterno();
  }
}

function erroInterno(): NextResponse<SendbotHorariosDisponiveisResponse> {
  return NextResponse.json(
    {
      status: "erro",
      mensagem:
        "Tivemos um problema ao buscar horários disponíveis. Tente novamente em alguns instantes.",
    },
    { status: 500 },
  );
}
