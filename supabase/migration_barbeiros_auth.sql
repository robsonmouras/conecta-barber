-- =============================================
-- Migration: Adicionar auth e roles à tabela barbeiros
-- Execute no SQL Editor do Supabase (após o schema principal)
-- =============================================

-- Adicionar colunas de autenticação e role
ALTER TABLE barbeiros
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS senha_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'colaborador'
    CHECK (role IN ('admin', 'colaborador'));

-- Atualizar o barbeiro Carlos para ser admin
-- Email: admin@zaply.com | Senha: admin123
-- IMPORTANTE: Troque a senha após o primeiro login em produção!
UPDATE barbeiros
SET
  email = 'admin@zaply.com',
  senha_hash = '$2b$10$CkU/yAbvPVyXHOHwJls6M.wdpKiI.Ihrbrks1AvaPzbaupq6gw0za',
  role = 'admin'
WHERE nome = 'Carlos'
  AND (email IS NULL OR email = '');
