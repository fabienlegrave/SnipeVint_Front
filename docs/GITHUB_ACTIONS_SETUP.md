# Configuration GitHub Actions pour les Alertes

Ce guide explique comment configurer GitHub Actions pour déclencher automatiquement les vérifications d'alertes Vinted.

## 📋 Prérequis

1. **Base de données Supabase** configurée avec les tables :
   - `price_alerts` (déjà existante)
   - `alert_matches` (créée par `create_alert_matches.sql`)
   - `vinted_credentials` (créée par `create_vinted_credentials.sql`)

2. **Application déployée** (Vercel, Railway, etc.) avec l'API accessible
   
   ⚠️ **Important** : Vous devez d'abord déployer votre application Next.js sur une plateforme d'hébergement (Vercel recommandé). 
   
   Voir le guide complet : [DEPLOYMENT.md](./DEPLOYMENT.md)
   
   Une fois déployé, vous obtiendrez une URL comme : `https://votre-app.vercel.app`

## 🔧 Configuration

### 1. Exécuter les migrations SQL

Dans votre dashboard Supabase, exécutez les migrations suivantes dans l'ordre :

1. `supabase/migrations/create_alert_matches.sql`
2. `supabase/migrations/create_vinted_credentials.sql`

### 2. Configurer les secrets GitHub

Allez dans votre repository GitHub → **Settings** → **Secrets and variables** → **Actions** et ajoutez :

- `SUPABASE_URL` : URL de votre projet Supabase (ex: `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role de Supabase (pas l'anon key !)
- `API_SECRET` : Même secret que `API_SECRET` dans votre `.env.local` et dans Vercel
- `API_BASE_URL` : **OBLIGATOIRE** - URL de votre application déployée (ex: `https://your-app.vercel.app`)
  
  ⚠️ **Important** : Cette URL doit être celle de votre application déployée sur Vercel/Railway/etc.

### 3. Sauvegarder les cookies Vinted

#### Option A : Via l'interface TokenManager

1. Allez dans votre application
2. Ouvrez la page Settings / Token Manager
3. Collez vos cookies Vinted complets
4. Cliquez sur "Save"
5. Les cookies seront automatiquement sauvegardés en base de données

#### Option B : Via l'API directement

```bash
curl -X POST https://your-app.vercel.app/api/v1/admin/vinted/save-cookies \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET" \
  -d '{
    "fullCookies": "access_token_web=xxx; refresh_token_web=yyy; ...",
    "notes": "Saved from manual API call"
  }'
```

### 4. Vérifier la configuration

Le workflow GitHub Actions est configuré pour s'exécuter :
- **Automatiquement** : Toutes les 5 minutes (cron: `*/5 * * * *`)
- **Manuellement** : Via l'onglet "Actions" → "Alerts Worker" → "Run workflow"

## 🚀 Test local

Pour tester le worker localement :

### Option 1 : Worker avec API HTTP (recommandé)

```bash
# Installer les dépendances
npm install

# Démarrer l'API localement (dans un terminal)
npm run dev

# Dans un autre terminal, configurer les variables d'environnement
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export API_SECRET="your-api-secret"
export API_BASE_URL="http://localhost:3000"

# Lancer le worker
node scripts/alertsWorker.js
```

### Option 2 : Worker standalone (sans API)

Le worker peut aussi fonctionner sans l'API HTTP en utilisant directement les fonctions backend. Cependant, cela nécessite que le projet soit compilé ou d'utiliser `ts-node`/`tsx`.

**Note** : Pour GitHub Actions, l'Option 1 (API HTTP) est recommandée car elle est plus simple à configurer et ne nécessite pas de compilation TypeScript.

## 📊 Monitoring

### Logs GitHub Actions

Les logs du worker sont disponibles dans :
- **GitHub** → **Actions** → Sélectionner un workflow → Voir les logs

### Vérifier les matches trouvés

1. **Via l'API** :
```bash
curl -X GET "https://your-app.vercel.app/api/v1/alerts/matches?limit=10" \
  -H "x-api-key: YOUR_API_SECRET"
```

2. **Via l'interface** :
- Allez dans la page **Items**
- Cliquez sur **"Alert Matches"** pour voir tous les items trouvés

### Vérifier les credentials

```bash
curl -X GET "https://your-app.vercel.app/api/v1/admin/vinted/save-cookies" \
  -H "x-api-key: YOUR_API_SECRET"
```

## 🔄 Renouvellement des cookies

Les cookies Vinted expirent périodiquement. Pour les renouveler :

1. **Via TokenManager** : Collez les nouveaux cookies et sauvegardez
2. **Via API** : Appelez `/api/v1/admin/vinted/save-cookies` avec les nouveaux cookies

Les anciens credentials seront automatiquement désactivés (`is_active = false`).

## ⚙️ Personnalisation

### Modifier la fréquence de vérification

Éditez `.github/workflows/alerts-worker.yml` :

```yaml
schedule:
  - cron: '*/5 * * * *'  # Toutes les 5 minutes
  # - cron: '0 * * * *'   # Toutes les heures
  # - cron: '0 */6 * * *' # Toutes les 6 heures
```

### Modifier le timeout

```yaml
timeout-minutes: 10  # Augmenter si nécessaire
```

## 🐛 Dépannage

### Erreur : "Aucun credential actif trouvé"

- Vérifiez que les cookies ont été sauvegardés en DB
- Vérifiez que `is_active = true` dans la table `vinted_credentials`

### Erreur : "API error: 401"

- Vérifiez que `API_SECRET` dans GitHub Actions correspond à celui de votre API
- Vérifiez que les cookies sont valides (testez via TokenManager)

### Erreur : "Database not available"

- Vérifiez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans les secrets GitHub
- Vérifiez que la clé service role est correcte (pas l'anon key)

### Le worker ne trouve aucun match

- Vérifiez que vous avez des alertes actives (`is_active = true`)
- Vérifiez les logs pour voir combien d'items ont été vérifiés
- Testez manuellement une alerte via l'interface

## 📝 Notes importantes

- ⚠️ **Ne partagez jamais** vos `SUPABASE_SERVICE_ROLE_KEY` ou `API_SECRET` publiquement
- 🔒 Les cookies contiennent des tokens d'authentification sensibles
- 📊 Les matches sont automatiquement sauvegardés dans `alert_matches` et `vinted_items`
- 🔄 Le worker met à jour `last_used_at` à chaque exécution

