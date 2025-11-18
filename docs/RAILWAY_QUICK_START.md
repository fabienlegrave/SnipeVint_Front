# 🚀 Quick Start : Déploiement Railway

Guide étape par étape pour déployer votre application sur Railway.

## ✅ Prérequis

- [ ] Code poussé sur GitHub
- [ ] Compte Railway créé (gratuit)
- [ ] Variables d'environnement prêtes

## 📝 Étapes détaillées

### 1. Créer un compte Railway

1. Allez sur **https://railway.app**
2. Cliquez sur **"Start a New Project"** ou **"Login"**
3. Connectez-vous avec **GitHub** (recommandé)

### 2. Créer un nouveau projet

1. Dans Railway, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Autorisez Railway à accéder à vos repositories GitHub
4. Sélectionnez votre repository `vinted_last`
5. Railway détecte automatiquement le **Dockerfile**

### 3. Configurer les variables d'environnement

Dans Railway, allez dans votre projet → **Variables** → **New Variable**

Ajoutez toutes ces variables (une par une) :

#### Variables Supabase
```
NEXT_PUBLIC_SUPABASE_URL
= https://votre-project.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
= votre_anon_key_ici

SUPABASE_URL
= https://votre-project.supabase.co

SUPABASE_SERVICE_ROLE_KEY
= votre_service_role_key_ici
```

#### Variables API
```
API_SECRET
= votre_secure_api_secret_ici

NEXT_PUBLIC_API_SECRET
= votre_secure_api_secret_ici
```

#### Variables optionnelles
```
OPENAI_API_KEY
= sk-proj-votre_key (si vous utilisez l'IA)

VINTED_ACCESS_TOKEN
= votre_token (optionnel)
```

#### Variables Puppeteer (automatiques via Dockerfile)
```
PUPPETEER_EXECUTABLE_PATH
= /usr/bin/chromium

PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
= true
```

⚠️ **Important** : Les variables `NEXT_PUBLIC_*` sont accessibles côté client. Les autres sont uniquement côté serveur.

### 4. Déployer

1. Railway commence automatiquement le déploiement
2. Allez dans **Deployments** pour voir les logs
3. Le build prend **5-10 minutes** la première fois

### 5. Obtenir l'URL

Une fois déployé :
1. Allez dans **Settings** → **Networking**
2. Railway vous donne une URL : `https://votre-app.up.railway.app`
3. Vous pouvez aussi configurer un domaine personnalisé

### 6. Tester

1. **Tester l'application** :
   - Ouvrez `https://votre-app.up.railway.app`
   - Vérifiez que l'application fonctionne

2. **Tester Puppeteer** :
   - Allez sur `/settings`
   - Cliquez sur **"Generate Cookies 🤖"**
   - Attendez 10-30 secondes
   - Vérifiez les logs

3. **Tester via API** :
```bash
curl -X POST https://votre-app.up.railway.app/api/v1/admin/vinted/generate-cookies \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_API_SECRET" \
  -d '{"autoSave": true}'
```

## 🐛 Dépannage

### Build échoue

**Erreur** : "Cannot find module"
- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez les logs Railway pour plus de détails

**Erreur** : "Chromium not found"
- Vérifiez que le Dockerfile installe Chromium
- Vérifiez `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`

### Application ne démarre pas

**Erreur** : "Port already in use"
- Railway gère automatiquement le port
- Vérifiez que `PORT` n'est pas défini manuellement

**Erreur** : "Environment variables missing"
- Vérifiez que toutes les variables sont définies dans Railway
- Vérifiez les noms (sensible à la casse)

### Puppeteer ne fonctionne pas

**Erreur** : "Could not find Chrome"
- Vérifiez les logs Railway
- Vérifiez que Chromium est installé dans le Dockerfile
- Vérifiez `PUPPETEER_EXECUTABLE_PATH`

## 📊 Vérifier les logs

Dans Railway :
1. Allez dans votre projet
2. Cliquez sur **Deployments**
3. Cliquez sur le dernier déploiement
4. Voir les **Build Logs** et **Deploy Logs**

## 🔄 Mise à jour

Chaque fois que vous poussez sur GitHub :
- Railway détecte automatiquement les changements
- Redéploie automatiquement
- Vous pouvez aussi déclencher manuellement dans Railway

## 💰 Coûts

**Plan gratuit** :
- $5 de crédit/mois
- Suffisant pour une petite application
- Pas de carte de crédit requise

**Plan Pro** ($20/mois) :
- Plus de ressources
- Domaine personnalisé
- Support prioritaire

## ✅ Checklist finale

- [ ] Compte Railway créé
- [ ] Repository GitHub connecté
- [ ] Dockerfile détecté
- [ ] Variables d'environnement configurées
- [ ] Déploiement réussi
- [ ] Application accessible
- [ ] Puppeteer fonctionne

---

**Une fois déployé, votre application fonctionne avec Puppeteer sur Railway !** 🎉

