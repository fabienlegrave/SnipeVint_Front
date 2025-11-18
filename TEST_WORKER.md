# 🧪 Test Rapide du Worker

## Étapes rapides

### 1. Démarrer l'API (Terminal 1)

```bash
npm run dev
```

Attendez que l'API soit prête.

### 2. Lancer le worker (Terminal 2)

```bash
npm run worker:alerts:local
```

Le script charge automatiquement `.env.local`.

### 3. Observer les logs

Vous devriez voir :
- `🚀 Démarrage du worker d'alertes...`
- `✅ Cookies récupérés depuis la DB` (ou génération si première fois)
- `🌐 Appel de l'API: http://localhost:3000/api/v1/alerts/check`
- `✅ Vérification terminée: X alertes, Y items, Z matches`

## ⚠️ Si erreur "Variables non définies"

Vérifiez que `.env.local` contient :
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_SECRET=your_secure_api_secret
```

## ✅ Si ça fonctionne

Le worker va :
1. Vérifier les alertes immédiatement
2. Attendre 5 minutes
3. Vérifier à nouveau
4. Répéter en boucle

Appuyez sur `Ctrl+C` pour arrêter.

