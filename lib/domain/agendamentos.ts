import { DateTime } from "luxon";
import { BARBERSHOP_TIMEZONE, DEFAULT_STATUS_AGENDAMENTO } from "../config/agenda";
import { supabaseServer } from "../supabase";
import type { AgendamentoStatus } from "./types";

export function buildDateTimeRange(
  data: string,
  hora: string,
  duracaoMinutos: number
) {
  // data: "2026-02-15", hora: "15:00"
  const inicio = DateTime.fromISO(`${data}T${hora}`, {
    zone: BARBERSHOP_TIMEZONE,
  });

  if (!inicio.isValid) {
    throw new Error("Data ou hora inválida");
  }

  const fim = inicio.plus({ minutes: duracaoMinutos });

  return {
    inicio: inicio.toUTC().toISO(),
    fim: fim.toUTC().toISO(),
  };
}

export async function existeConflitoAgendamento(params: {
  barbeiroId: string;
  inicioUtcIso: string;
  fimUtcIso: string;
}) {
  const { barbeiroId, inicioUtcIso, fimUtcIso } = params;

  const { data, error } = await supabaseServer
    .from("agendamentos")
    .select("id")
    .eq("barbeiro_id", barbeiroId)
    .neq("status", "cancelado")
    .or(
      // (inicio_novo < fim_existente) AND (fim_novo > inicio_existente)
      `and(data_hora_inicio.lt.${fimUtcIso},data_hora_fim.gt.${inicioUtcIso})`
    );

  if (error) {
    throw error;
  }

  return !!data && data.length > 0;
}

export function statusInicialAgendamento(): AgendamentoStatus {
  return DEFAULT_STATUS_AGENDAMENTO;
}

export function gerarSlotsDoDia(params: {
  data: string;
  inicioExpediente: string; // "09:00"
  fimExpediente: string; // "18:00"
  duracaoMinutos: number;
}): string[] {
  const { data, inicioExpediente, fimExpediente, duracaoMinutos } = params;

  const inicio = DateTime.fromISO(`${data}T${inicioExpediente}`, {
    zone: BARBERSHOP_TIMEZONE,
  });
  const fim = DateTime.fromISO(`${data}T${fimExpediente}`, {
    zone: BARBERSHOP_TIMEZONE,
  });

  if (!inicio.isValid || !fim.isValid || fim <= inicio) {
    return [];
  }

  const slots: string[] = [];
  let atual = inicio;

  while (atual.plus({ minutes: duracaoMinutos }) <= fim) {
    slots.push(atual.toFormat("HH:mm"));
    atual = atual.plus({ minutes: duracaoMinutos });
  }

  return slots;
}

