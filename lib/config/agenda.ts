export const BARBERSHOP_TIMEZONE =
  process.env.BARBERSHOP_TIMEZONE ?? "America/Sao_Paulo";

export const DEFAULT_BARBEIRO_NOME =
  process.env.DEFAULT_BARBEIRO_NOME ?? "Carlos";

export const DEFAULT_STATUS_AGENDAMENTO =
  (process.env.DEFAULT_STATUS_AGENDAMENTO as "pendente" | "confirmado" | undefined) ??
  "confirmado";

