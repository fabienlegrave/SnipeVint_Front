# ✅ Checklist de Déploiement - Rotating Proxy Cluster

Suivez cette checklist étape par étape pour déployer le cluster.

## 📋 Prérequis

- [ ] Fly.io CLI installé (`flyctl --version`)
- [ ] Connecté à Fly.io (`fly auth whoami`)
- [ ] Secrets de base disponibles (Supabase, API keys)

## 🏗️ Étape 1 : Créer les Apps

```bash
# Créer les 3 apps pour les nodes
fly apps create scraper-fr
fly apps create scraper-nl
fly apps create scraper-us
```

- [ ] `scraper-fr` créé
- [ ] `scraper-nl` créé
- [ ] `scraper-us` créé

## 🔐 Étape 2 : Configurer les Secrets - scraper-fr

```bash
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set SUPABASE_SERVICE_ROLE_KEY="..." --app scraper-fr
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-fr
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="..." --app scraper-fr
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-fr
```

- [ ] Secrets configurés pour `scraper-fr`

## 🔐 Étape 3 : Configurer les Secrets - scraper-nl

```bash
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-nl
fly secrets set SUPABASE_SERVICE_ROLE_KEY="..." --app scraper-nl
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-nl
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-nl
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="..." --app scraper-nl
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-nl
```

- [ ] Secrets configurés pour `scraper-nl`

## 🔐 Étape 4 : Configurer les Secrets - scraper-us

```bash
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-us
fly secrets set SUPABASE_SERVICE_ROLE_KEY="..." --app scraper-us
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-us
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-us
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="..." --app scraper-us
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-us
```

- [ ] Secrets configurés pour `scraper-us`

## 🚀 Étape 5 : Déployer les Nodes

```bash
fly deploy --config fly.scraper-fr.toml --app scraper-fr
fly deploy --config fly.scraper-nl.toml --app scraper-nl
fly deploy --config fly.scraper-us.toml --app scraper-us
```

- [ ] `scraper-fr` déployé avec succès
- [ ] `scraper-nl` déployé avec succès
- [ ] `scraper-us` déployé avec succès

## ⚙️ Étape 6 : Configurer le Gateway

```bash
# URLs des nodes (réseau interne Fly.io)
fly secrets set SCRAPER_FR_URL="http://scraper-fr.internal:3000" --app vinted-last
fly secrets set SCRAPER_NL_URL="http://scraper-nl.internal:3000" --app vinted-last
fly secrets set SCRAPER_US_URL="http://scraper-us.internal:3000" --app vinted-last

# Activer le gateway
fly secrets set ENABLE_GATEWAY="true" --app vinted-last

# Configuration optionnelle
fly secrets set GATEWAY_ROTATION_STRATEGY="round-robin" --app vinted-last
fly secrets set GATEWAY_BAN_DURATION_MS="900000" --app vinted-last  # 15 minutes
fly secrets set GATEWAY_TIMEOUT_MS="30000" --app vinted-last
fly secrets set GATEWAY_RETRY_ATTEMPTS="3" --app vinted-last
```

- [ ] URLs des nodes configurées
- [ ] Gateway activé
- [ ] Configuration optionnelle définie

## 🔄 Étape 7 : Redéployer l'App Principale

```bash
fly deploy --app vinted-last
```

- [ ] App principale redéployée avec succès

## ✅ Étape 8 : Vérification

### Vérifier le statut des apps

```bash
fly status --app scraper-fr
fly status --app scraper-nl
fly status --app scraper-us
fly status --app vinted-last
```

- [ ] Toutes les apps sont actives

### Tester le gateway

```bash
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: vinted_scraper_secure_2024"
```

- [ ] Gateway répond avec les statistiques
- [ ] 3 nodes sont visibles dans les stats

### Tester une requête

```bash
curl -X POST https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "Content-Type: application/json" \
  -H "x-api-key: vinted_scraper_secure_2024" \
  -d '{
    "url": "https://www.vinted.fr/api/v2/catalog/items?search_text=nintendo&per_page=5&page=1",
    "method": "GET"
  }'
```

- [ ] Requête réussie
- [ ] Réponse contient `nodeUsed`

## 📊 Étape 9 : Monitoring

### Vérifier les logs

```bash
fly logs --app vinted-last | grep -i gateway
fly logs --app scraper-fr
```

- [ ] Logs du gateway visibles
- [ ] Logs des nodes visibles

### Vérifier les statistiques

```bash
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: vinted_scraper_secure_2024"
```

- [ ] Statistiques accessibles
- [ ] Tous les nodes sont `available`

## 🎉 Déploiement Terminé !

Si toutes les cases sont cochées, votre cluster est opérationnel !

## 🔧 Prochaines Étapes

- [ ] Monitorer les performances pendant quelques heures
- [ ] Ajuster la configuration si nécessaire
- [ ] Ajouter plus de nodes si besoin
- [ ] Documenter les métriques importantes

## 🆘 En Cas de Problème

Consultez `GUIDE_DEPLOIEMENT_CLUSTER.md` section "Dépannage" pour plus d'aide.

