-- Table de liaison pour tracer les items trouvés par les alertes
CREATE TABLE IF NOT EXISTS alert_matches (
  id BIGSERIAL PRIMARY KEY,
  alert_id INTEGER NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES vinted_items(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_reason TEXT,
  UNIQUE(alert_id, item_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_alert_matches_alert_id ON alert_matches(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_item_id ON alert_matches(item_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_matched_at ON alert_matches(matched_at DESC);

-- Commentaires
COMMENT ON TABLE alert_matches IS 'Trace les items trouvés par les alertes de prix';
COMMENT ON COLUMN alert_matches.alert_id IS 'ID de l''alerte qui a trouvé l''item';
COMMENT ON COLUMN alert_matches.item_id IS 'ID de l''item trouvé';
COMMENT ON COLUMN alert_matches.matched_at IS 'Date et heure où l''item a été trouvé par l''alerte';
COMMENT ON COLUMN alert_matches.match_reason IS 'Raison du match (ex: Title match, Price match, etc.)';

