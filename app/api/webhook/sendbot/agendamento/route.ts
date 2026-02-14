import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import {
  type SendbotAgendamentoPayload,
  type SendbotAgendamentoResponse,
  type SendbotAgendamentoResponseErro,
} from "@/lib/domain/types";
import {
  buildDateTimeRange,
  existeConflitoAgendamento,
  statusInicialAgendamento,
} from "@/lib/domain/agendamentos";
import { DEFAULT_BARBEIRO_NOME } from "@/lib/config/agenda";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SendbotAgendamentoResponse>> {
  try {
    const body = (await request.json()) as Partial<SendbotAgendamentoPayload>;

    if (
      !body.cliente_whatsapp ||
      !body.servico_nome ||
      !body.data ||
      !body.hora
    ) {
      return NextResponse.json(
        {
          status: "erro",
          motivo: "payload_invalido",
          mensagem:
            "Dados incompletos. Envie whatsapp do cliente, serviço, data e hora.",
        },
        { status: 400 },
      );
    }

    const payload: SendbotAgendamentoPayload = {
      cliente_nome: body.cliente_nome,
      cliente_whatsapp: body.cliente_whatsapp,
      servico_nome: body.servico_nome,
      data: body.data,
      hora: body.hora,
      barbeiro_nome: body.barbeiro_nome ?? DEFAULT_BARBEIRO_NOME,
    };

    // 1) Buscar ou criar cliente
    const { data: clienteExistente, error: clienteSelectError } =
      await supabaseServer
        .from("clientes")
        .select("*")
        .eq("whatsapp", payload.cliente_whatsapp)
        .maybeSingle();

    if (clienteSelectError) {
      console.error("Erro ao buscar cliente", clienteSelectError);
      return erroInterno();
    }

    let clienteId = clienteExistente?.id as string | undefined;
    let clienteNomeFinal =
      clienteExistente?.nome ?? payload.cliente_nome ?? null;

    if (!clienteId) {
      const { data: novoCliente, error: clienteInsertError } =
        await supabaseServer
          .from("clientes")
          .insert({
            whatsapp: payload.cliente_whatsapp,
            nome: payload.cliente_nome ?? null,
          })
          .select()
          .single();

      if (clienteInsertError || !novoCliente) {
        console.error("Erro ao criar cliente", clienteInsertError);
        return erroInterno();
      }

      clienteId = novoCliente.id;
      clienteNomeFinal = novoCliente.nome;
    } else if (!clienteExistente?.nome && payload.cliente_nome) {
      const { error: clienteUpdateError } = await supabaseServer
        .from("clientes")
        .update({ nome: payload.cliente_nome })
        .eq("id", clienteId);

      if (clienteUpdateError) {
        console.warn(
          "Falha ao atualizar nome do cliente",
          clienteUpdateError,
        );
      } else {
        clienteNomeFinal = payload.cliente_nome;
      }
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
          motivo: "servico_nao_encontrado",
          mensagem: "Serviço não encontrado ou inativo.",
        },
        { status: 404 },
      );
    }

    // 3) Buscar barbeiro
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
          motivo: "barbeiro_nao_encontrado",
          mensagem: "Barbeiro não encontrado ou inativo.",
        },
        { status: 404 },
      );
    }

    // 4) Montar data/hora início e fim
    const { inicio, fim } = buildDateTimeRange(
      payload.data,
      payload.hora,
      servico.duracao_minutos,
    );

    // 5) Verificar conflito
    const temConflito = await existeConflitoAgendamento({
      barbeiroId: barbeiro.id,
      inicioUtcIso: inicio,
      fimUtcIso: fim,
    });

    if (temConflito) {
      return NextResponse.json(
        {
          status: "erro",
          motivo: "conflito_horario",
          mensagem:
            "Esse horário não está disponível, escolha outro horário na agenda.",
        },
        { status: 200 },
      );
    }

    const status = statusInicialAgendamento();

    // 6) Criar agendamento
    const { data: novoAgendamento, error: agendamentoError } =
      await supabaseServer
        .from("agendamentos")
        .insert({
          cliente_id: clienteId,
          barbeiro_id: barbeiro.id,
          servico_id: servico.id,
          data_hora_inicio: inicio,
          data_hora_fim: fim,
          status,
          origem: "whatsapp",
        })
        .select(
          `
          id,
          data_hora_inicio,
          status,
          clientes:cliente_id ( nome, whatsapp ),
          barbeiros:barbeiro_id ( nome ),
          servicos:servico_id ( nome )
        `,
        )
        .single();

    if (agendamentoError || !novoAgendamento) {
      console.error("Erro ao criar agendamento", agendamentoError);
      return erroInterno();
    }

    const barbeirosRel = Array.isArray(novoAgendamento.barbeiros)
      ? novoAgendamento.barbeiros[0]
      : novoAgendamento.barbeiros;
    const servicosRel = Array.isArray(novoAgendamento.servicos)
      ? novoAgendamento.servicos[0]
      : novoAgendamento.servicos;
    const clientesRel = Array.isArray(novoAgendamento.clientes)
      ? novoAgendamento.clientes[0]
      : novoAgendamento.clientes;

    const mensagemConfirmacao = `Seu horário foi agendado para ${payload.data} às ${payload.hora} com ${(barbeirosRel as { nome?: string })?.nome ?? payload.barbeiro_nome} para ${(servicosRel as { nome?: string })?.nome ?? payload.servico_nome}.`;

    return NextResponse.json(
      {
        status: "ok",
        mensagem: mensagemConfirmacao,
        resumo_agendamento: {
          id: novoAgendamento.id,
          cliente_nome: (clientesRel as { nome?: string })?.nome ?? clienteNomeFinal,
          cliente_whatsapp:
            (clientesRel as { whatsapp?: string })?.whatsapp ?? payload.cliente_whatsapp,
          servico_nome: (servicosRel as { nome?: string })?.nome ?? payload.servico_nome,
          barbeiro_nome:
            (barbeirosRel as { nome?: string })?.nome ?? payload.barbeiro_nome!,
          data: payload.data,
          hora: payload.hora,
          status,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("Erro inesperado no webhook de agendamento", e);
    return erroInterno();
  }
}

function erroInterno(): NextResponse<SendbotAgendamentoResponseErro> {
  return NextResponse.json(
    {
      status: "erro",
      motivo: "erro_interno",
      mensagem:
        "Tivemos um problema ao processar seu agendamento. Tente novamente em alguns instantes.",
    },
    { status: 500 },
  );
}

