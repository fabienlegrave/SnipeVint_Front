# Migration: Alert Matches Table

Cette migration crée une table de liaison `alert_matches` pour tracer les items trouvés par les alertes de prix.

## Exécution de la migration

1. Ouvrez votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Copiez le contenu de `create_alert_matches.sql`
4. Exécutez la requête

## Structure de la table

- `id`: Identifiant unique
- `alert_id`: ID de l'alerte (référence à `price_alerts`)
- `item_id`: ID de l'item trouvé (référence à `vinted_items`)
- `matched_at`: Date et heure du match
- `match_reason`: Raison du match (ex: "Title match: 2/2 words found")

## Utilisation

Une fois la migration exécutée, les items trouvés par les alertes seront automatiquement enregistrés dans cette table. Vous pourrez ensuite les voir dans la page **Items** en sélectionnant la vue "Alert Matches".

