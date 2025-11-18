-- Ajouter la colonne condition à la table price_alerts
-- La condition peut être: 'neuf', 'complet', 'boite', 'loose', ou NULL (tous les états)

ALTER TABLE price_alerts 
ADD COLUMN IF NOT EXISTS condition TEXT;

COMMENT ON COLUMN price_alerts.condition IS 'Status IDs de l''API Vinted pour filtrer par état: "6,1" (neuf), "2" (très bon état), "3" (bon état), ou NULL pour tous les états';

