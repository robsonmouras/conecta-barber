export type AgendamentoStatus = "pendente" | "confirmado" | "cancelado";

export interface SendbotAgendamentoPayload {
  cliente_nome?: string;
  cliente_whatsapp: string;
  servico_nome: string;
  data: string; // "2026-02-15"
  hora: string; // "15:00"
  barbeiro_nome?: string;
}

export interface SendbotAgendamentoResponseOk {
  status: "ok";
  mensagem: string;
  resumo_agendamento: {
    id: string;
    cliente_nome: string | null;
    cliente_whatsapp: string;
    servico_nome: string;
    barbeiro_nome: string;
    data: string; // "2026-02-15"
    hora: string; // "15:00"
    status: AgendamentoStatus;
  };
}

export interface SendbotAgendamentoResponseErro {
  status: "erro";
  motivo:
    | "payload_invalido"
    | "servico_nao_encontrado"
    | "barbeiro_nao_encontrado"
    | "conflito_horario"
    | "erro_interno";
  mensagem: string;
}

export type SendbotAgendamentoResponse =
  | SendbotAgendamentoResponseOk
  | SendbotAgendamentoResponseErro;

export interface SendbotHorariosDisponiveisPayload {
  data: string; // "2026-02-15"
  barbeiro_nome: string;
  servico_nome: string;
}

export interface SendbotHorariosDisponiveisResponse {
  status: "ok" | "erro";
  horarios_disponiveis?: string[];
  mensagem?: string;
}

