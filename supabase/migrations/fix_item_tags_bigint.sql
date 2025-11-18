-- Migration pour corriger le type de item_id dans item_tags
-- Les IDs Vinted sont des bigint (peuvent dépasser integer)

-- Vérifier si la table existe et modifier le type si nécessaire
DO $$
BEGIN
  -- Vérifier si la colonne item_id existe et est de type integer
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'item_tags' 
    AND column_name = 'item_id' 
    AND data_type = 'integer'
  ) THEN
    -- Modifier le type de integer à bigint
    ALTER TABLE item_tags 
    ALTER COLUMN item_id TYPE BIGINT;
    
    RAISE NOTICE 'Colonne item_id modifiée de integer à bigint';
  ELSE
    RAISE NOTICE 'Colonne item_id déjà en bigint ou table n''existe pas';
  END IF;
END $$;

COMMENT ON COLUMN item_tags.item_id IS 'ID de l''item Vinted (bigint car les IDs peuvent dépasser integer)';

