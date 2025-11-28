# Guide de Déploiement Fly.io

## ⚠️ Points Importants AVANT le Déploiement

### 1. Secrets à Configurer ❌

Le fichier `set-secrets.sh` contient des **credentials en clair** :
- ❌ `SUPABASE_SERVICE_ROLE_KEY` exposée
- ❌ `VINTED_FULL_COOKIES` exposés
- ❌ `TELEGRAM_BOT_TOKEN` exposé

**🚨 NE JAMAIS commit ces secrets dans Git !**

### 2. Architecture Multi-Workers

Le projet utilise **5 apps Fly.io** :
- 1x Main Worker (load balancer)
- 4x Regional Workers (FR, US, NL, UK)

Chaque app doit être déployée séparément.

### 3. Variables d'Environnement Manquantes

Certaines nouvelles variables ne sont pas encore configurées :
```env
# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Webhooks (optionnel)
DISCORD_WEBHOOK_URL=
SLACK_WEBHOOK_URL=

# Cache
SEARCH_CACHE_ENABLED=true
SEARCH_CACHE_TTL_MINUTES=15
```

---

## 📋 Étapes de Déploiement

### Étape 1 : Nettoyer les Secrets

```bash
# 1. Copier le fichier de secrets
cp scripts/set-secrets.sh scripts/set-secrets.local.sh

# 2. Éditer avec VOS valeurs
nano scripts/set-secrets.local.sh

# 3. Ajouter au .gitignore
echo "scripts/set-secrets.local.sh" >> .gitignore
```

### Étape 2 : Installer Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Ou avec Homebrew
brew install flyctl

# Authentification
fly auth login
```

### Étape 3 : Créer les Apps (première fois)

```bash
# Exécuter le script de création
chmod +x scripts/deploy-all.sh
./scripts/deploy-all.sh
```

**OU** créer manuellement :

```bash
fly apps create main-worker --org your-org
fly apps create worker-fr --org your-org
fly apps create worker-us --org your-org
fly apps create worker-nl --org your-org
fly apps create worker-uk --org your-org
```

### Étape 4 : Configurer les Secrets

**Option A : Script automatique**
```bash
chmod +x scripts/set-secrets.local.sh
./scripts/set-secrets.local.sh
```

**Option B : Manuellement**
```bash
# Main Worker
fly secrets set \
  API_SECRET="votre-secret-tres-securise" \
  SUPABASE_URL="https://xxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJhbG..." \
  TELEGRAM_BOT_TOKEN="123456:ABC..." \
  TELEGRAM_CHAT_ID="-1001234567" \
  --app main-worker

# Répéter pour worker-fr, worker-us, worker-nl, worker-uk
```

### Étape 5 : Vérifier les URLs des Workers

Éditer `fly.main-worker.toml` avec les bonnes URLs :

```toml
[env]
  WORKER_FR_URL = 'https://worker-fr-xxx.fly.dev'
  WORKER_US_URL = 'https://worker-us-xxx.fly.dev'
  WORKER_NL_URL = 'https://worker-nl-xxx.fly.dev'
  WORKER_UK_URL = 'https://worker-uk-xxx.fly.dev'
```

### Étape 6 : Déployer

**Déployer toutes les apps :**
```bash
# Main Worker
fly deploy --config fly.main-worker.toml --app main-worker

# Workers régionaux
fly deploy --config fly.worker-fr.toml --app worker-fr
fly deploy --config fly.worker-us.toml --app worker-us
fly deploy --config fly.worker-nl.toml --app worker-nl
fly deploy --config fly.worker-uk.toml --app worker-uk
```

**OU** utiliser le script :
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 🔧 Configuration Post-Déploiement

### 1. Vérifier la Santé

```bash
# Status des apps
fly status --app main-worker
fly status --app worker-fr

# Logs en temps réel
fly logs --app main-worker

# Health check
curl https://main-worker.fly.dev/api/health
```

### 2. Tester les Endpoints

```bash
# Health check détaillé
curl https://main-worker.fly.dev/api/v1/health/detailed

# System metrics (nécessite API key)
curl -H "x-api-key: votre-secret" \
  https://main-worker.fly.dev/api/v1/system/metrics

# Cache stats
curl -H "x-api-key: votre-secret" \
  https://main-worker.fly.dev/api/v1/cache/stats
```

### 3. Initialiser les Cookies

```bash
# Via l'endpoint d'initialisation
curl -X POST \
  -H "x-api-key: votre-secret" \
  https://main-worker.fly.dev/api/init
```

### 4. Configurer les Webhooks (optionnel)

```bash
# Enregistrer un webhook Discord
curl -X POST \
  -H "x-api-key: votre-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "discord-alerts",
    "url": "https://discord.com/api/webhooks/...",
    "events": ["alert.match"],
    "isActive": true
  }' \
  https://main-worker.fly.dev/api/v1/webhooks/register
```

---

## 🚨 Problèmes Courants

### Build Échoue

**Symptôme** : Build timeout ou erreur Puppeteer

**Solution** :
```bash
# Augmenter la RAM dans fly.*.toml
[[vm]]
  memory = '2gb'  # Au lieu de 1gb
  cpus = 2
```

### Secrets Non Disponibles

**Symptôme** : `SUPABASE_URL is not defined`

**Solution** :
```bash
# Lister les secrets actuels
fly secrets list --app main-worker

# Vérifier qu'ils sont bien définis
fly secrets set SUPABASE_URL="https://..." --app main-worker
```

### 403 Forbidden de Vinted

**Symptôme** : Toutes les requêtes Vinted échouent avec 403

**Solution** :
1. Regénérer les cookies Vinted
2. Mettre à jour `VINTED_FULL_COOKIES`
3. Relancer l'app : `fly apps restart main-worker`

### Workers Inaccessibles

**Symptôme** : Main worker ne peut pas joindre les workers régionaux

**Solution** :
1. Vérifier que les workers sont démarrés : `fly status --app worker-fr`
2. Vérifier les URLs dans `fly.main-worker.toml`
3. Tester directement : `curl https://worker-fr-xxx.fly.dev/api/health`

---

## 📊 Monitoring Production

### Logs

```bash
# Logs en temps réel
fly logs --app main-worker

# Logs des 24 dernières heures
fly logs --app main-worker --tail=1000

# Filtrer par type
fly logs --app main-worker | grep ERROR
```

### Métriques

```bash
# CPU/RAM/Network
fly metrics --app main-worker

# Dashboard web
fly dashboard main-worker
```

### Alertes

Configurer des alertes via Fly.io Dashboard :
1. Aller sur https://fly.io/dashboard
2. Sélectionner votre app
3. Monitoring > Alerts
4. Créer des alertes pour :
   - CPU > 80%
   - RAM > 90%
   - Health check failures
   - 5xx errors

---

## 🔄 Mises à Jour

### Déploiement d'une Nouvelle Version

```bash
# 1. Build et test local
npm run build
npm run test:run

# 2. Commit les changements
git add .
git commit -m "feat: nouvelle fonctionnalité"

# 3. Déployer
fly deploy --config fly.main-worker.toml --app main-worker
```

### Rollback

```bash
# Lister les versions
fly releases --app main-worker

# Rollback vers une version précédente
fly releases rollback v12 --app main-worker
```

---

## 💰 Optimisation des Coûts

### Auto-Stop/Start

Les apps sont configurées pour s'arrêter automatiquement :

```toml
[http_service]
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 1
```

**Coût** : ~$5-10/mois par app avec auto-stop

### Scaling Manuel

```bash
# Réduire à 0 instance (arrêt complet)
fly scale count 0 --app worker-uk

# Augmenter à 2 instances
fly scale count 2 --app main-worker

# Changer la taille VM
fly scale vm shared-cpu-2x --app main-worker
```

---

## 📝 Checklist Finale

Avant de considérer le déploiement comme terminé :

### Sécurité
- [ ] Secrets non commitées dans Git
- [ ] API_SECRET changé (pas le défaut)
- [ ] HTTPS uniquement (configuré par défaut)
- [ ] Rate limiting actif

### Fonctionnel
- [ ] Health checks passent (200 OK)
- [ ] Main worker peut joindre tous les workers
- [ ] Cache fonctionne (vérifier cache stats)
- [ ] Alertes fonctionnent (tester manuellement)
- [ ] Webhooks configurés (si nécessaire)

### Performance
- [ ] Build < 5 minutes
- [ ] Cold start < 10 secondes
- [ ] Latence API < 500ms
- [ ] Cache hit rate > 50%

### Monitoring
- [ ] Logs accessibles
- [ ] Métriques visibles
- [ ] Alertes configurées
- [ ] Dashboard bookmarked

---

## 🆘 Support

En cas de problème :

1. **Logs** : `fly logs --app main-worker`
2. **Status** : `fly status --app main-worker`
3. **SSH** : `fly ssh console --app main-worker`
4. **Forum Fly.io** : https://community.fly.io/
5. **Documentation** : https://fly.io/docs/

---

## 📚 Ressources

- [Documentation Fly.io](https://fly.io/docs/)
- [Fly.io Status](https://status.fly.io/)
- [Pricing Calculator](https://fly.io/docs/about/pricing/)
- [Discord Community](https://fly.io/discord)

---

## ✅ Résumé : Déploiement Rapide

Si tout est déjà configuré :

```bash
# 1. Authentification
fly auth login

# 2. Configurer secrets
./scripts/set-secrets.local.sh

# 3. Déployer
fly deploy --config fly.main-worker.toml --app main-worker
fly deploy --config fly.worker-fr.toml --app worker-fr
fly deploy --config fly.worker-us.toml --app worker-us
fly deploy --config fly.worker-nl.toml --app worker-nl
fly deploy --config fly.worker-uk.toml --app worker-uk

# 4. Vérifier
fly status --app main-worker
curl https://main-worker.fly.dev/api/health
```

**Durée totale** : 15-20 minutes (première fois)
**Durée updates** : 5 minutes

🎉 **C'est parti !**
