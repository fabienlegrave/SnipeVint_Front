# 🚀 Rotating Proxy Cluster - Guide Complet

Système de cluster de proxies rotatifs entièrement hébergé sur Fly.io, similaire à ScraperAPI mais gratuit et auto-hébergé.

## 📋 Architecture

```
┌───────────────────────┐
│     Gateway API       │  (vinted-last - middleware central)
│  (middleware central) │
└──────────┬────────────┘
           │
   ┌───────┼───────┐
   │       │       │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│ FR  │ │ NL  │ │ US  │
│cdg  │ │ams  │ │iad  │
│IP#1 │ │IP#2 │ │IP#3 │
└──┬──┘ └──┬──┘ └──┬──┘
   │       │       │
   ▼       ▼       ▼
Vinted.com
```

### Composants

1. **Gateway API** (middleware central)
   - App principale : `vinted-last`
   - Route les requêtes vers les workers
   - Gère la rotation automatique
   - Gère les bans temporaires

2. **Scraper Nodes** (workers)
   - `scraper-fr` : Paris (cdg)
   - `scraper-nl` : Amsterdam (ams)
   - `scraper-us` : Virginia (iad)
   - Chaque node a sa propre IP sortante

## 🚀 Déploiement

### Étape 1: Créer les apps Scraper Nodes

```bash
# Créer l'app FR (Paris)
fly apps create scraper-fr

# Créer l'app NL (Amsterdam)
fly apps create scraper-nl

# Créer l'app US (Virginia)
fly apps create scraper-us
```

### Étape 2: Configurer les secrets pour chaque app

```bash
# Secrets communs pour tous les nodes
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set SUPABASE_SERVICE_ROLE_KEY="your_key" --app scraper-fr
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-fr

# Répéter pour scraper-nl et scraper-us
fly secrets set SUPABASE_URL="..." --app scraper-nl
fly secrets set SUPABASE_SERVICE_ROLE_KEY="..." --app scraper-nl
fly secrets set API_SECRET="..." --app scraper-nl

fly secrets set SUPABASE_URL="..." --app scraper-us
fly secrets set SUPABASE_SERVICE_ROLE_KEY="..." --app scraper-us
fly secrets set API_SECRET="..." --app scraper-us
```

### Étape 3: Déployer les Scraper Nodes

```bash
# Déployer le node FR
fly deploy --config fly.scraper-fr.toml --app scraper-fr

# Déployer le node NL
fly deploy --config fly.scraper-nl.toml --app scraper-nl

# Déployer le node US
fly deploy --config fly.scraper-us.toml --app scraper-us
```

### Étape 4: Configurer le Gateway (app principale)

Dans l'app principale `vinted-last`, configurer les URLs des nodes :

```bash
# URLs internes Fly.io (recommandé - plus rapide et gratuit)
fly secrets set SCRAPER_FR_URL="http://scraper-fr.internal:3000" --app vinted-last
fly secrets set SCRAPER_NL_URL="http://scraper-nl.internal:3000" --app vinted-last
fly secrets set SCRAPER_US_URL="http://scraper-us.internal:3000" --app vinted-last

# Stratégie de rotation (optionnel, défaut: round-robin)
fly secrets set GATEWAY_ROTATION_STRATEGY="round-robin" --app vinted-last
# Options: round-robin, random, least-used, health-based

# Durée du ban en ms (défaut: 15 minutes)
fly secrets set GATEWAY_BAN_DURATION_MS="900000" --app vinted-last

# Timeout des requêtes en ms (défaut: 30 secondes)
fly secrets set GATEWAY_TIMEOUT_MS="30000" --app vinted-last

# Nombre de tentatives avant abandon (défaut: 3)
fly secrets set GATEWAY_RETRY_ATTEMPTS="3" --app vinted-last
```

### Étape 5: Créer un réseau privé Fly.io (optionnel mais recommandé)

Pour que les nodes communiquent via le réseau interne Fly.io (plus rapide et gratuit) :

```bash
# Créer un réseau privé
fly wireguard create

# Les apps peuvent maintenant communiquer via .internal
# Exemple: http://scraper-fr.internal:3000
```

## 📡 Utilisation

### Via l'API Gateway

```bash
# Faire une requête via le gateway
curl -X POST https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_secret" \
  -d '{
    "url": "https://www.vinted.fr/api/v2/catalog/items?search_text=nintendo",
    "method": "GET"
  }'
```

### Récupérer les statistiques du cluster

```bash
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: your_api_secret"
```

Réponse :
```json
{
  "success": true,
  "stats": {
    "totalNodes": 3,
    "availableNodes": 2,
    "bannedNodes": 1,
    "unhealthyNodes": 0,
    "nodes": [
      {
        "id": "scraper-fr",
        "name": "Scraper FR",
        "region": "cdg",
        "isHealthy": true,
        "isBanned": false,
        "requestCount": 150,
        "successCount": 145,
        "errorCount": 5,
        "successRate": 96.67
      },
      ...
    ]
  }
}
```

## 🔄 Stratégies de Rotation

### round-robin (défaut)
- Rotation séquentielle entre les nodes disponibles
- Équitable et prévisible

### random
- Sélection aléatoire d'un node disponible
- Moins prévisible, peut aider à éviter les patterns

### least-used
- Sélectionne le node avec le moins de requêtes
- Équilibre la charge

### health-based
- Sélectionne le node avec le meilleur ratio de succès
- Optimise pour la performance

## 🛡️ Gestion des Bans

### Ban automatique
- Si un node reçoit un 403, il est automatiquement banni pour 15 minutes (configurable)
- Le gateway bascule automatiquement sur un autre node
- Après expiration du ban, le node est réactivé automatiquement

### Réinitialisation manuelle
Vous pouvez réinitialiser un node via l'API (à implémenter si nécessaire).

## 📊 Monitoring

### Logs
```bash
# Logs du gateway
fly logs --app vinted-last

# Logs d'un node spécifique
fly logs --app scraper-fr
fly logs --app scraper-nl
fly logs --app scraper-us
```

### Métriques
- Nombre de requêtes par node
- Taux de succès par node
- Nodes bannis
- Nodes unhealthy

## 🔧 Configuration Avancée

### Ajouter plus de nodes

1. Créer une nouvelle app :
```bash
fly apps create scraper-de
```

2. Créer un `fly.scraper-de.toml` :
```toml
app = 'scraper-de'
primary_region = 'fra'  # Frankfurt
```

3. Déployer :
```bash
fly deploy --config fly.scraper-de.toml --app scraper-de
```

4. Ajouter au gateway dans `lib/scraper/gateway.ts` :
```typescript
{
  id: 'scraper-de',
  name: 'Scraper DE',
  region: 'fra',
  url: process.env.SCRAPER_DE_URL || 'http://scraper-de.internal:3000',
  ...
}
```

5. Configurer l'URL :
```bash
fly secrets set SCRAPER_DE_URL="http://scraper-de.internal:3000" --app vinted-last
```

### Utiliser des URLs publiques (si nécessaire)

Si vous ne pouvez pas utiliser le réseau interne Fly.io, utilisez les URLs publiques :

```bash
fly secrets set SCRAPER_FR_URL="https://scraper-fr.fly.dev" --app vinted-last
fly secrets set SCRAPER_NL_URL="https://scraper-nl.fly.dev" --app vinted-last
fly secrets set SCRAPER_US_URL="https://scraper-us.fly.dev" --app vinted-last
```

## 💰 Coûts

- **Gratuit** : Les apps peuvent s'arrêter automatiquement (`auto_stop_machines = 'stop'`)
- **Payant** : Si vous voulez que les nodes restent toujours actifs, utilisez `min_machines_running = 1`
- **Réseau interne** : Gratuit entre les apps Fly.io
- **Réseau externe** : Payant si vous utilisez les URLs publiques

## 🎯 Avantages

1. **Gratuit** : Pas de coûts de proxy externes
2. **Contrôle total** : Vous contrôlez tout le système
3. **Scalable** : Ajoutez facilement plus de nodes
4. **Automatique** : Rotation et gestion des bans automatiques
5. **Rapide** : Communication interne Fly.io (réseau privé)

## ⚠️ Limitations

1. **IP Fly.io** : Les IPs Fly.io peuvent être connues et bloquées
2. **Coûts** : Si vous gardez les nodes toujours actifs
3. **Complexité** : Plus complexe qu'un proxy externe

## 🔍 Dépannage

### Un node ne répond pas

1. Vérifier les logs :
```bash
fly logs --app scraper-fr
```

2. Vérifier le statut :
```bash
fly status --app scraper-fr
```

3. Redémarrer :
```bash
fly apps restart scraper-fr
```

### Tous les nodes sont bannis

1. Augmenter `GATEWAY_BAN_DURATION_MS` pour réduire la fréquence
2. Ajouter plus de nodes
3. Vérifier si les IPs Fly.io sont bloquées

### Le gateway ne trouve pas les nodes

1. Vérifier les URLs dans les secrets
2. Vérifier que les apps sont déployées
3. Vérifier le réseau privé Fly.io (wireguard)

## 📝 Notes

- Les nodes peuvent s'arrêter automatiquement pour économiser les coûts
- Le gateway les réveillera automatiquement lors de la première requête
- Utilisez le réseau interne Fly.io (`.internal`) pour de meilleures performances

