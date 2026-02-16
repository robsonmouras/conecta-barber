-- =============================================
-- Zaply - Schema de tabelas para Supabase
-- Execute no SQL Editor do painel Supabase
-- =============================================

-- 1) clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT NOT NULL UNIQUE,
  nome TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2) barbeiros
CREATE TABLE IF NOT EXISTS barbeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3) servicos
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  preco_centavos INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4) agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  barbeiro_id UUID NOT NULL REFERENCES barbeiros(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
  origem TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbeiro_data
  ON agendamentos(barbeiro_id, data_hora_inicio);

CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente
  ON agendamentos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status
  ON agendamentos(status) WHERE status != 'cancelado';

-- =============================================
-- Dados iniciais (opcional - descomente se quiser)
-- =============================================

-- Barbeiro padrão (idempotente)
INSERT INTO barbeiros (nome, ativo)
SELECT 'Carlos', true
WHERE NOT EXISTS (SELECT 1 FROM barbeiros WHERE nome = 'Carlos');

-- Serviços exemplo com valores médios de mercado (Brasil 2024-2025)
-- Corte: R$ 25-35 | Barba: R$ 20-30 | Corte+Barba: R$ 40-55 | Sobrancelha: R$ 10-15
INSERT INTO servicos (nome, duracao_minutos, preco_centavos, ativo)
SELECT 'Corte', 30, 3000, true
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Corte');
INSERT INTO servicos (nome, duracao_minutos, preco_centavos, ativo)
SELECT 'Barba', 20, 2500, true
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Barba');
INSERT INTO servicos (nome, duracao_minutos, preco_centavos, ativo)
SELECT 'Corte + Barba', 45, 5000, true
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Corte + Barba');
INSERT INTO servicos (nome, duracao_minutos, preco_centavos, ativo)
SELECT 'Sobrancelha', 15, 1200, true
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Sobrancelha');
