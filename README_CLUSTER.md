# 🚀 Rotating Proxy Cluster - Résumé Exécutif

## 📋 Qu'est-ce que c'est ?

Un système de **proxy rotatif auto-hébergé** sur Fly.io qui :
- ✅ Route automatiquement vos requêtes vers 3 workers dans différentes régions
- ✅ Change automatiquement de worker en cas de 403 (ban)
- ✅ Gère les bans temporaires (15 minutes)
- ✅ Fournit des statistiques en temps réel
- ✅ **100% gratuit** (réseau interne Fly.io)

## 🏗️ Architecture

```
┌───────────────────────┐
│   Gateway (vinted-last)│  ← Votre app principale
│   (middleware)        │
└──────────┬────────────┘
           │
   ┌───────┼───────┐
   │       │       │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│ FR  │ │ NL  │ │ US  │
│Paris│ │Lond │ │Virg │
│cdg  │ │lhr  │ │iad  │
└─────┘ └─────┘ └─────┘
```

## ⚡ Démarrage Rapide

### 1. Créer les apps (1 fois)

```bash
fly apps create scraper-fr
fly apps create scraper-nl
fly apps create scraper-us
```

### 2. Configurer les secrets (pour chaque node)

```bash
# Exemple pour scraper-fr (répéter pour scraper-nl et scraper-us)
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set SUPABASE_SERVICE_ROLE_KEY="votre_cle" --app scraper-fr
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-fr
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="votre_cle" --app scraper-fr
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-fr
```

### 3. Déployer les nodes

```bash
fly deploy --config fly.scraper-fr.toml --app scraper-fr
fly deploy --config fly.scraper-nl.toml --app scraper-nl
fly deploy --config fly.scraper-us.toml --app scraper-us
```

### 4. Activer le gateway

```bash
# Dans l'app principale vinted-last
fly secrets set SCRAPER_FR_URL="http://scraper-fr.internal:3000" --app vinted-last
fly secrets set SCRAPER_NL_URL="http://scraper-nl.internal:3000" --app vinted-last
fly secrets set SCRAPER_US_URL="http://scraper-us.internal:3000" --app vinted-last
fly secrets set ENABLE_GATEWAY="true" --app vinted-last
fly deploy --app vinted-last
```

### 5. Tester

```bash
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: vinted_scraper_secure_2024"
```

## 📖 Documentation Complète

- **Guide de déploiement détaillé** : `GUIDE_DEPLOIEMENT_CLUSTER.md`
- **Documentation technique** : `ROTATING_PROXY_CLUSTER.md`

## 🎯 Utilisation

### Via l'API Gateway

```bash
curl -X POST https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "Content-Type: application/json" \
  -H "x-api-key: votre_api_secret" \
  -d '{
    "url": "https://www.vinted.fr/api/v2/catalog/items?search_text=nintendo",
    "method": "GET"
  }'
```

### Statistiques

```bash
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: votre_api_secret"
```

## 🔧 Configuration

### Variables d'environnement (Gateway)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `ENABLE_GATEWAY` | `false` | Activer le gateway |
| `SCRAPER_FR_URL` | `http://scraper-fr.internal:3000` | URL du node FR |
| `SCRAPER_NL_URL` | `http://scraper-nl.internal:3000` | URL du node NL |
| `SCRAPER_US_URL` | `http://scraper-us.internal:3000` | URL du node US |
| `GATEWAY_ROTATION_STRATEGY` | `round-robin` | Stratégie de rotation |
| `GATEWAY_BAN_DURATION_MS` | `900000` | Durée du ban (15 min) |
| `GATEWAY_TIMEOUT_MS` | `30000` | Timeout (30s) |
| `GATEWAY_RETRY_ATTEMPTS` | `3` | Nombre de tentatives |

### Stratégies de rotation

- `round-robin` : Rotation séquentielle (défaut)
- `random` : Sélection aléatoire
- `least-used` : Node le moins utilisé
- `health-based` : Meilleur taux de succès

## 📊 Fonctionnalités

✅ **Rotation automatique** : Bascule sur un autre node en cas de 403  
✅ **Bans temporaires** : Node banni 15 min après un 403, puis réactivé  
✅ **Statistiques** : Monitoring en temps réel de chaque node  
✅ **Fallback** : Si un node est down, utilise les autres  
✅ **Scalable** : Ajoutez facilement plus de nodes  

## 💰 Coûts

- **Gratuit** : Les apps peuvent s'arrêter automatiquement
- **Réseau interne** : Gratuit entre apps Fly.io (`.internal`)
- **Payant** : Seulement si vous gardez les nodes toujours actifs

## 🆘 Dépannage

### Les nodes ne répondent pas

```bash
fly logs --app scraper-fr
fly status --app scraper-fr
fly apps restart scraper-fr
```

### Le gateway ne trouve pas les nodes

```bash
fly secrets list --app vinted-last
fly apps list
```

### Tous les nodes sont bannis

- Augmenter `GATEWAY_BAN_DURATION_MS`
- Ajouter plus de nodes
- Vérifier si les IPs Fly.io sont bloquées

## 📝 Fichiers Importants

- `lib/scraper/gateway.ts` : Logique du gateway
- `app/api/v1/scrape/gateway/route.ts` : API Gateway
- `app/api/v1/scrape/execute/route.ts` : Endpoint des nodes
- `fly.scraper-*.toml` : Configurations Fly.io
- `GUIDE_DEPLOIEMENT_CLUSTER.md` : Guide complet

## ✅ Checklist de Déploiement

- [ ] Créer les 3 apps (scraper-fr, scraper-nl, scraper-us)
- [ ] Configurer les secrets pour chaque node
- [ ] Déployer les 3 nodes
- [ ] Configurer le gateway dans vinted-last
- [ ] Activer ENABLE_GATEWAY
- [ ] Redéployer vinted-last
- [ ] Tester le gateway
- [ ] Vérifier les statistiques

---

**Prêt à déployer ?** Suivez le guide complet : `GUIDE_DEPLOIEMENT_CLUSTER.md`

