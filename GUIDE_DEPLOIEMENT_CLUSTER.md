# 🚀 Guide de Déploiement - Rotating Proxy Cluster

Guide complet et clair pour déployer et utiliser le système de Rotating Proxy Cluster sur Fly.io.

## 📋 Vue d'ensemble

Le système consiste en :
- **1 Gateway** (app principale `vinted-last`) : Route les requêtes
- **3 Scraper Nodes** : Workers dans différentes régions avec leurs propres IPs
  - `scraper-fr` : Paris (cdg)
  - `scraper-nl` : London (lhr) - proche géographiquement d'Amsterdam
  - `scraper-us` : Virginia (iad)

## ✅ Prérequis

1. Avoir Fly.io CLI installé et configuré
2. Avoir les secrets de base configurés dans `vinted-last`
3. Avoir accès à votre compte Fly.io

## 📦 Étape 1 : Créer les apps Scraper Nodes

```bash
# Créer les 3 apps pour les nodes
fly apps create scraper-fr
fly apps create scraper-nl
fly apps create scraper-us
```

## 🔐 Étape 2 : Configurer les secrets pour chaque node

Pour chaque node (scraper-fr, scraper-nl, scraper-us), configurez les secrets :

```bash
# Pour scraper-fr
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set SUPABASE_SERVICE_ROLE_KEY="votre_cle_service_role" --app scraper-fr
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-fr
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-fr
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="votre_cle_anon" --app scraper-fr
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-fr

# Répéter pour scraper-nl
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-nl
fly secrets set SUPABASE_SERVICE_ROLE_KEY="votre_cle_service_role" --app scraper-nl
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-nl
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-nl
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="votre_cle_anon" --app scraper-nl
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-nl

# Répéter pour scraper-us
fly secrets set SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-us
fly secrets set SUPABASE_SERVICE_ROLE_KEY="votre_cle_service_role" --app scraper-us
fly secrets set API_SECRET="vinted_scraper_secure_2024" --app scraper-us
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://gmumhsqlewekjlrdsmgf.supabase.co" --app scraper-us
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="votre_cle_anon" --app scraper-us
fly secrets set NEXT_PUBLIC_API_SECRET="vinted_scraper_secure_2024" --app scraper-us
```

## 🚀 Étape 3 : Déployer les Scraper Nodes

```bash
# Déployer le node FR (Paris)
fly deploy --config fly.scraper-fr.toml --app scraper-fr

# Déployer le node NL (Amsterdam)
fly deploy --config fly.scraper-nl.toml --app scraper-nl

# Déployer le node US (Virginia)
fly deploy --config fly.scraper-us.toml --app scraper-us
```

**Note** : Le premier déploiement peut prendre quelques minutes.

## ⚙️ Étape 4 : Configurer le Gateway (app principale)

Dans l'app principale `vinted-last`, configurez les URLs des nodes et les paramètres du gateway :

```bash
# URLs internes des nodes (recommandé - plus rapide et gratuit)
fly secrets set SCRAPER_FR_URL="http://scraper-fr.internal:3000" --app vinted-last
fly secrets set SCRAPER_NL_URL="http://scraper-nl.internal:3000" --app vinted-last
fly secrets set SCRAPER_US_URL="http://scraper-us.internal:3000" --app vinted-last

# Activer le gateway
fly secrets set ENABLE_GATEWAY="true" --app vinted-last

# Stratégie de rotation (optionnel, défaut: round-robin)
# Options: round-robin, random, least-used, health-based
fly secrets set GATEWAY_ROTATION_STRATEGY="round-robin" --app vinted-last

# Durée du ban en ms (défaut: 15 minutes = 900000ms)
fly secrets set GATEWAY_BAN_DURATION_MS="900000" --app vinted-last

# Timeout des requêtes en ms (défaut: 30 secondes)
fly secrets set GATEWAY_TIMEOUT_MS="30000" --app vinted-last

# Nombre de tentatives avant abandon (défaut: 3)
fly secrets set GATEWAY_RETRY_ATTEMPTS="3" --app vinted-last
```

## 🔄 Étape 5 : Redéployer l'app principale

```bash
# Redéployer l'app principale avec le gateway activé
fly deploy --app vinted-last
```

## ✅ Étape 6 : Vérifier le déploiement

### Vérifier que les nodes sont actifs

```bash
# Statut des apps
fly status --app scraper-fr
fly status --app scraper-nl
fly status --app scraper-us
fly status --app vinted-last
```

### Tester le gateway

```bash
# Récupérer les statistiques du cluster
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: vinted_scraper_secure_2024"
```

Vous devriez voir :
```json
{
  "success": true,
  "stats": {
    "totalNodes": 3,
    "availableNodes": 3,
    "bannedNodes": 0,
    "unhealthyNodes": 0,
    "nodes": [...]
  }
}
```

### Tester une requête via le gateway

```bash
curl -X POST https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "Content-Type: application/json" \
  -H "x-api-key: vinted_scraper_secure_2024" \
  -d '{
    "url": "https://www.vinted.fr/api/v2/catalog/items?search_text=nintendo&per_page=5&page=1",
    "method": "GET"
  }'
```

## 📊 Utilisation

### Via l'API Gateway (recommandé)

```bash
# Faire une requête via le gateway
curl -X POST https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "Content-Type: application/json" \
  -H "x-api-key: votre_api_secret" \
  -d '{
    "url": "https://www.vinted.fr/api/v2/catalog/items?search_text=nintendo",
    "method": "GET",
    "headers": {
      "Cookie": "votre_cookie_string"
    }
  }'
```

### Récupérer les statistiques

```bash
curl -X GET https://vinted-last.fly.dev/api/v1/scrape/gateway \
  -H "x-api-key: votre_api_secret"
```

## 🔍 Monitoring

### Logs

```bash
# Logs du gateway
fly logs --app vinted-last

# Logs d'un node spécifique
fly logs --app scraper-fr
fly logs --app scraper-nl
fly logs --app scraper-us
```

### Statistiques en temps réel

Les statistiques incluent :
- Nombre total de nodes
- Nodes disponibles
- Nodes bannis (avec durée restante)
- Nodes unhealthy
- Pour chaque node :
  - Nombre de requêtes
  - Taux de succès
  - Dernière erreur

## 🛠️ Dépannage

### Les nodes ne répondent pas

1. Vérifier les logs :
```bash
fly logs --app scraper-fr
```

2. Vérifier le statut :
```bash
fly status --app scraper-fr
```

3. Redémarrer si nécessaire :
```bash
fly apps restart scraper-fr
```

### Le gateway ne trouve pas les nodes

1. Vérifier les URLs dans les secrets :
```bash
fly secrets list --app vinted-last
```

2. Vérifier que les apps sont déployées :
```bash
fly apps list
```

3. Vérifier les logs du gateway :
```bash
fly logs --app vinted-last | grep -i gateway
```

### Tous les nodes sont bannis

1. Augmenter la durée du ban (si nécessaire) :
```bash
fly secrets set GATEWAY_BAN_DURATION_MS="1800000" --app vinted-last  # 30 minutes
```

2. Ajouter plus de nodes (voir section "Ajouter des nodes")

3. Vérifier si les IPs Fly.io sont bloquées

### Erreur "Aucun node disponible"

1. Vérifier que les nodes sont déployés et actifs
2. Vérifier les URLs dans les secrets
3. Vérifier les logs pour voir pourquoi les nodes sont marqués comme unavailable

## ➕ Ajouter des nodes supplémentaires

### Créer un nouveau node

```bash
# Créer l'app
fly apps create scraper-de

# Configurer les secrets (même que pour les autres nodes)
fly secrets set SUPABASE_URL="..." --app scraper-de
# ... (autres secrets)

# Créer le fichier fly.scraper-de.toml
# (copier depuis fly.scraper-fr.toml et changer app et primary_region)

# Déployer
fly deploy --config fly.scraper-de.toml --app scraper-de
```

### Ajouter au gateway

Modifier `lib/scraper/gateway.ts` pour ajouter le nouveau node dans `DEFAULT_CONFIG.nodes`.

Puis configurer l'URL :
```bash
fly secrets set SCRAPER_DE_URL="http://scraper-de.internal:3000" --app vinted-last
```

Redéployer l'app principale :
```bash
fly deploy --app vinted-last
```

## 💰 Coûts

- **Gratuit** : Les apps peuvent s'arrêter automatiquement (`auto_stop_machines = 'stop'`)
- **Payant** : Si vous voulez que les nodes restent toujours actifs, utilisez `min_machines_running = 1` dans `fly.toml`
- **Réseau interne** : Gratuit entre les apps Fly.io (`.internal`)
- **Réseau externe** : Payant si vous utilisez les URLs publiques

## ⚙️ Configuration avancée

### Stratégies de rotation

- **round-robin** (défaut) : Rotation séquentielle équitable
- **random** : Sélection aléatoire
- **least-used** : Node avec le moins de requêtes
- **health-based** : Node avec le meilleur taux de succès

### Durée des bans

- **Défaut** : 15 minutes (900000 ms)
- **Recommandé** : 15-30 minutes pour éviter les bans répétés
- **Configurable** : Via `GATEWAY_BAN_DURATION_MS`

### Timeout

- **Défaut** : 30 secondes
- **Configurable** : Via `GATEWAY_TIMEOUT_MS`

## 📝 Notes importantes

1. **Réseau interne Fly.io** : Utilisez toujours `.internal` pour les URLs (gratuit et plus rapide)
2. **Auto-stop** : Les nodes s'arrêtent automatiquement pour économiser les coûts
3. **Wake-up** : Les nodes se réveillent automatiquement à la première requête
4. **Bans automatiques** : Les nodes bannis sont automatiquement réactivés après expiration
5. **Fallback** : Si le gateway échoue, le système peut fallback vers le mode direct (si configuré)

## 🎯 Prochaines étapes

1. Déployer les 3 nodes
2. Configurer le gateway
3. Tester avec quelques requêtes
4. Monitorer les statistiques
5. Ajuster la configuration selon les besoins

## ❓ Questions fréquentes

**Q: Dois-je garder les nodes toujours actifs ?**
R: Non, ils peuvent s'arrêter automatiquement. Ils se réveilleront à la première requête.

**Q: Combien de nodes dois-je avoir ?**
R: Minimum 3 pour la redondance. Vous pouvez en ajouter plus si nécessaire.

**Q: Les IPs Fly.io sont-elles bloquées ?**
R: C'est possible. Dans ce cas, ajoutez plus de nodes ou utilisez d'autres régions.

**Q: Puis-je utiliser des URLs publiques au lieu de .internal ?**
R: Oui, mais cela coûtera plus cher et sera plus lent.

**Q: Comment savoir quel node a été utilisé ?**
R: La réponse du gateway inclut `nodeUsed` avec l'ID du node.

---

**Support** : Consultez les logs pour plus d'informations en cas de problème.

