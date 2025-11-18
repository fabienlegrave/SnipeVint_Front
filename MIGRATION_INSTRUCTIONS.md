# 🔧 Instructions pour exécuter la migration

## Problème
La colonne `condition` n'existe pas encore dans la table `price_alerts` en base de données.

## Solution : Exécuter la migration SQL

### Option 1 : Via le Dashboard Supabase (Recommandé)

1. **Ouvrez votre projet Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Connectez-vous et sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur **"SQL Editor"**
   - Cliquez sur **"New query"**

3. **Copiez et exécutez cette migration :**

```sql
-- Ajouter la colonne condition à la table price_alerts
-- La condition stocke les status_ids (ex: "6,1" pour neuf, "2" pour très bon état, "3" pour bon état)

ALTER TABLE price_alerts 
ADD COLUMN IF NOT EXISTS condition TEXT;

COMMENT ON COLUMN price_alerts.condition IS 'Status IDs de l''API Vinted pour filtrer par état: "6,1" (neuf), "2" (très bon état), "3" (bon état), ou NULL pour tous les états';
```

4. **Exécutez la requête**
   - Cliquez sur **"Run"** ou appuyez sur `Ctrl+Enter`

5. **Vérifiez que ça fonctionne**
   - Vous devriez voir un message de succès
   - Essayez de créer une alerte avec des conditions dans l'interface

### Option 2 : Via la ligne de commande (si vous avez Supabase CLI)

```bash
# Si vous avez Supabase CLI installé
supabase db push
```

Ou exécutez directement :

```bash
psql $DATABASE_URL -f supabase/migrations/add_condition_to_price_alerts.sql
```

## ✅ Vérification

Après avoir exécuté la migration, vous pouvez vérifier que la colonne existe :

```sql
-- Dans le SQL Editor de Supabase
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'price_alerts' AND column_name = 'condition';
```

Vous devriez voir :
```
column_name | data_type
------------|----------
condition   | text
```

## 🎯 Après la migration

Une fois la migration exécutée, vous pourrez :
- ✅ Créer des alertes avec des conditions sélectionnées
- ✅ Éditer les conditions des alertes existantes
- ✅ Voir les badges de conditions dans l'interface

---

**Note :** Si vous avez déjà des alertes en base, elles auront `condition = NULL`, ce qui signifie "tous les états" (comportement par défaut).

