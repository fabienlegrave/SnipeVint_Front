-- Table pour stocker les credentials Vinted (cookies) pour GitHub Actions
CREATE TABLE IF NOT EXISTS vinted_credentials (
  id SERIAL PRIMARY KEY,
  full_cookies TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  user_id TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  notes TEXT
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_vinted_credentials_active ON vinted_credentials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vinted_credentials_updated_at ON vinted_credentials(updated_at DESC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_vinted_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vinted_credentials_updated_at
  BEFORE UPDATE ON vinted_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_vinted_credentials_updated_at();

-- Commentaires
COMMENT ON TABLE vinted_credentials IS 'Stocke les credentials Vinted (cookies) pour utilisation par GitHub Actions';
COMMENT ON COLUMN vinted_credentials.full_cookies IS 'Chaîne complète de cookies Vinted (access_token_web, cf_clearance, etc.)';
COMMENT ON COLUMN vinted_credentials.is_active IS 'Indique si ces credentials sont actifs et peuvent être utilisés';
COMMENT ON COLUMN vinted_credentials.last_used_at IS 'Date de dernière utilisation (pour monitoring)';

