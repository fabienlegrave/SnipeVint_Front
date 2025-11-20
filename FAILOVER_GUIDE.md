# Guide de Configuration du Système de Failover Automatique

Le système de failover automatique permet de gérer automatiquement les erreurs 403 en :
- Redémarrant les machines
- Changeant de région
- Utilisant plusieurs apps comme fallback

## 🚀 Activation

### 1. Variables d'environnement

Ajoutez ces variables dans les secrets Fly.io :

```bash
# Activer le failover automatique
fly secrets set ENABLE_FAILOVER=true --app vinted-last

# Régions disponibles (séparées par des virgules)
fly secrets set FAILOVER_REGIONS=cdg,iad,lhr --app vinted-last

# Nombre de 403 consécutifs avant failover (défaut: 3)
fly secrets set MAX_403_BEFORE_FAILOVER=3 --app vinted-last

# Délai minimum entre failovers en millisecondes (défaut: 5 minutes)
fly secrets set FAILOVER_COOLDOWN_MS=300000 --app vinted-last

# Apps de fallback (séparées par des virgules, optionnel)
# Si vous avez plusieurs apps Fly.io, vous pouvez les utiliser comme fallback
fly secrets set FAILOVER_APPS=vinted-last,vinted-last-backup --app vinted-last
```

### 2. Installation de l'outil Fly.io CLI

Le système utilise la CLI Fly.io pour gérer les machines. Assurez-vous que la CLI est installée et configurée :

```bash
# Installer Fly.io CLI (si pas déjà fait)
curl -L https://fly.io/install.sh | sh

# Se connecter
fly auth login

# Vérifier la connexion
fly apps list
```

**Note importante** : La CLI Fly.io doit être accessible depuis le worker. Sur Fly.io, cela fonctionne automatiquement car le worker tourne dans l'environnement Fly.io.

## 📋 Stratégie de Failover

Le système essaie les stratégies dans l'ordre suivant :

### Étape 1: Redémarrage de la machine
- Redémarre la machine actuelle
- Le plus rapide et le moins coûteux
- Peut résoudre les problèmes temporaires

### Étape 2: Changement de région
- Déplace la machine vers une autre région
- Ou crée une nouvelle machine dans une nouvelle région
- Utile si l'IP de la région actuelle est bloquée

### Étape 3: Changement d'app (fallback)
- Utilise une autre app Fly.io comme fallback
- Nécessite d'avoir configuré `FAILOVER_APPS`
- Utile si vous avez plusieurs apps déployées

## 🔧 Configuration Avancée

### Régions disponibles

Les régions Fly.io disponibles incluent :
- `cdg` - Paris, France
- `iad` - Washington, D.C., USA
- `lhr` - London, UK
- `sjc` - San Jose, USA
- `nrt` - Tokyo, Japan
- `syd` - Sydney, Australia

Voir toutes les régions : `fly regions list`

### Exemple de configuration complète

```bash
# Configuration de base
fly secrets set ENABLE_FAILOVER=true --app vinted-last
fly secrets set FAILOVER_REGIONS=cdg,iad,lhr --app vinted-last
fly secrets set MAX_403_BEFORE_FAILOVER=3 --app vinted-last
fly secrets set FAILOVER_COOLDOWN_MS=300000 --app vinted-last

# Si vous avez plusieurs apps
fly secrets set FAILOVER_APPS=vinted-last,vinted-last-backup,vinted-last-backup2 --app vinted-last
```

## 📊 Monitoring

Le système enregistre l'historique des failovers. Vous pouvez consulter les logs :

```bash
# Voir les logs du worker
fly logs --app vinted-last -a worker

# Filtrer les logs de failover
fly logs --app vinted-last -a worker | grep -i failover
```

## ⚠️ Limitations

1. **Cooldown** : Un failover ne peut pas être déclenché plus d'une fois toutes les 5 minutes (configurable)
2. **Seuil de 403** : Le failover ne se déclenche qu'après 3 erreurs 403 consécutives (configurable)
3. **Coûts** : Créer de nouvelles machines ou les déplacer peut générer des coûts supplémentaires
4. **CLI Fly.io** : Le système nécessite que la CLI Fly.io soit accessible (automatique sur Fly.io)

## 🎯 Cas d'usage

### Scénario 1: Blocage IP temporaire
- Le système détecte 3 erreurs 403
- Redémarre la machine (nouvelle IP)
- Le problème est résolu

### Scénario 2: Blocage IP de région
- Le système détecte 3 erreurs 403
- Redémarrage ne fonctionne pas
- Change de région (nouvelle IP)
- Le problème est résolu

### Scénario 3: Blocage complet
- Le système détecte 3 erreurs 403
- Redémarrage et changement de région ne fonctionnent pas
- Change d'app (si configuré)
- Le problème est résolu

## 🔍 Dépannage

### Le failover ne se déclenche pas

1. Vérifier que `ENABLE_FAILOVER=true` est configuré
2. Vérifier les logs pour voir si les erreurs 403 sont détectées
3. Vérifier que le seuil `MAX_403_BEFORE_FAILOVER` est atteint

### Le failover échoue

1. Vérifier que la CLI Fly.io est accessible
2. Vérifier les permissions de l'app Fly.io
3. Vérifier que les régions configurées sont valides
4. Consulter les logs pour plus de détails

### Coûts élevés

1. Réduire le nombre de régions dans `FAILOVER_REGIONS`
2. Augmenter `FAILOVER_COOLDOWN_MS` pour réduire la fréquence
3. Augmenter `MAX_403_BEFORE_FAILOVER` pour être plus conservateur

## 📝 Notes

- Le système réinitialise automatiquement le compteur de 403 après un succès
- L'historique des failovers est limité à 50 entrées
- Le système attend 30 secondes après un failover pour que la nouvelle machine soit prête

