-- =============================================
-- Corrigir conta admin - Execute no SQL Editor do Supabase
-- Garante que o admin exista com email e senha corretos
-- =============================================

-- 1) Garantir que as colunas existam
ALTER TABLE barbeiros
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS senha_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'colaborador'
    CHECK (role IN ('admin', 'colaborador'));

-- 2) Inserir Carlos se não existir
INSERT INTO barbeiros (nome, ativo)
SELECT 'Carlos', true
WHERE NOT EXISTS (SELECT 1 FROM barbeiros WHERE nome = 'Carlos');

-- 3) Atualizar ou inserir admin
-- Email: admin@zaply.com | Senha: admin123
UPDATE barbeiros
SET
  email = 'admin@zaply.com',
  senha_hash = '$2b$10$CkU/yAbvPVyXHOHwJls6M.wdpKiI.Ihrbrks1AvaPzbaupq6gw0za',
  role = 'admin',
  ativo = true
WHERE nome = 'Carlos';

-- Verificar se funcionou (deve retornar 1 linha)
SELECT id, nome, email, role, ativo, (senha_hash IS NOT NULL) as tem_senha
FROM barbeiros
WHERE email = 'admin@zaply.com';
