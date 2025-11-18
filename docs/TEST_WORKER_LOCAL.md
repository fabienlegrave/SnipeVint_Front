# 🧪 Test du Worker en Local

Guide pour tester le worker d'alertes avec Puppeteer en local.

## ✅ Prérequis

### 1. Variables d'environnement

Assurez-vous que votre `.env.local` contient :

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_SECRET=your_secure_api_secret
CHECK_INTERVAL_MINUTES=5
API_BASE_URL=http://localhost:3000
```

### 2. API accessible

Le worker a besoin que l'API soit accessible. Deux options :

**Option A : API locale (Recommandé pour test)**
```bash
# Dans un terminal séparé
npm run dev
```

**Option B : API déployée**
- Déployez votre app sur Railway
- Configurez `API_BASE_URL=https://your-app.up.railway.app`

### 3. Chrome installé pour Puppeteer

Vérifiez que Chrome est installé :
```bash
npx puppeteer browsers list
```

Si pas installé :
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx puppeteer browsers install chrome
```

## 🚀 Test

### 1. Démarrer l'API (si locale)

Dans un **premier terminal** :
```bash
npm run dev
```

Attendez que l'API soit prête (message "Ready" dans les logs).

### 2. Lancer le worker

Dans un **deuxième terminal** :
```bash
npm run worker:alerts
```

Ou directement :
```bash
node scripts/alertsWorkerPuppeteer.js
```

### 3. Observer les logs

Vous devriez voir :

```
🚀 Démarrage du worker d'alertes...
⏰ Intervalle de vérification: 5 minutes

============================================================
🔄 Vérification des alertes - 2025-11-17T21:30:00.000Z
============================================================
✅ Cookies récupérés depuis la DB
🌐 Appel de l'API: http://localhost:3000/api/v1/alerts/check
✅ Vérification terminée:
   - Alertes vérifiées: 2
   - Items vérifiés: 150
   - Matches trouvés: 3

⏱️  Durée: 12s
⏰ Prochaine vérification dans 5 minutes...
```

## 🔍 Vérifications

### Si les cookies sont générés

Si vous voyez :
```
⚠️ Aucun cookie en DB, génération via Puppeteer...
🔄 Génération des cookies via Puppeteer...
🌐 Navigation vers Vinted...
✅ Cookies générés: 15 cookies
✅ Cookies sauvegardés en DB
```

C'est normal la première fois ou si les cookies ont expiré.

### Si des matches sont trouvés

```
🎯 Matches trouvés:
   - Alerte "Nintendo Switch": Super Mario Odyssey (Title match)
```

Les matches sont automatiquement sauvegardés en base de données.

## 🐛 Dépannage

### Erreur : "API error: 500"

**Cause** : L'API n'est pas accessible ou il y a une erreur côté serveur.

**Solution** :
- Vérifiez que `npm run dev` tourne
- Vérifiez les logs de l'API
- Vérifiez que `API_BASE_URL` est correct

### Erreur : "Puppeteer non installé"

**Solution** :
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### Erreur : "Could not find Chrome"

**Solution** :
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx puppeteer browsers install chrome
```

### Erreur : "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis"

**Solution** :
- Vérifiez que `.env.local` existe
- Vérifiez que les variables sont définies
- Le worker lit depuis `process.env`, pas depuis `.env.local` directement

**Pour charger `.env.local`** :
```bash
# Utiliser dotenv-cli
npm install -g dotenv-cli
dotenv -e .env.local -- node scripts/alertsWorkerPuppeteer.js
```

Ou créer un script dans `package.json` :
```json
"worker:alerts:local": "dotenv -e .env.local -- node scripts/alertsWorkerPuppeteer.js"
```

### Le worker s'arrête immédiatement

**Causes possibles** :
- Erreur fatale
- Pas d'alertes actives
- Cookies invalides

**Solution** :
- Vérifiez les logs pour l'erreur exacte
- Vérifiez qu'il y a au moins une alerte active en DB
- Vérifiez que les cookies sont valides

## ⏹️ Arrêter le worker

Pour arrêter le worker proprement :
- Appuyez sur `Ctrl+C` dans le terminal
- Le worker gère l'arrêt propre et affiche "🛑 Arrêt du worker..."

## ✅ Checklist

- [ ] Variables d'environnement configurées
- [ ] API accessible (locale ou déployée)
- [ ] Chrome installé pour Puppeteer
- [ ] Au moins une alerte active en DB
- [ ] Worker lancé et fonctionne
- [ ] Logs affichés correctement
- [ ] Matches sauvegardés en DB

## 🎯 Prochaines étapes

Une fois que ça fonctionne en local :
1. Tester plusieurs cycles (attendre 5 minutes)
2. Vérifier que les matches sont bien sauvegardés
3. Déployer sur Railway pour un fonctionnement 24/7

---

**Le worker est prêt à être testé !** 🚀

