# 🚀 Test Rapide du Worker

## Étapes

### 1. Terminal 1 : Démarrer l'API

```bash
npm run dev
```

Attendez que l'API soit prête (message "Ready").

### 2. Terminal 2 : Lancer le worker

```bash
npm run worker:alerts
```

Le worker charge automatiquement `.env.local`.

## ✅ Ce que vous devriez voir

```
🚀 Démarrage du worker d'alertes...
⏰ Intervalle de vérification: 5 minutes

============================================================
🔄 Vérification des alertes - [timestamp]
============================================================
✅ Cookies récupérés depuis la DB
🌐 Appel de l'API: http://localhost:3000/api/v1/alerts/check
✅ Vérification terminée:
   - Alertes vérifiées: X
   - Items vérifiés: Y
   - Matches trouvés: Z

⏱️  Durée: Xs
⏰ Prochaine vérification dans 5 minutes...
```

## ⏹️ Arrêter

Appuyez sur `Ctrl+C` dans le terminal du worker.

## 🐛 Si erreur

Vérifiez que `.env.local` contient :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_SECRET` (optionnel)

