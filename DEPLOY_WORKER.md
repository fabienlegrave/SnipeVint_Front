# Guide de déploiement du Worker sur Fly.io

Le worker d'alertes doit tourner en continu, indépendamment de l'app web qui peut s'arrêter.

## Déploiement initial

1. **Déployer l'app principale** (si pas déjà fait) :
```bash
fly deploy
```

2. **Créer une machine dédiée pour le worker** :
```bash
fly scale count worker=1
```

Cette commande crée une machine séparée qui exécute le processus `worker` et qui reste active même quand l'app web s'arrête.

## Vérification

Vérifier que le worker tourne :
```bash
fly status
```

Vous devriez voir deux machines :
- Une machine pour `app` (peut s'arrêter)
- Une machine pour `worker` (reste active)

## Logs du worker

Voir les logs du worker :
```bash
fly logs --app vinted-last -a worker
```

## Redéploiement

Après chaque modification du code, redéployer :
```bash
fly deploy
```

Le worker sera automatiquement redéployé avec la nouvelle version.

## Configuration

Le worker utilise le même `Dockerfile.worker` et les mêmes secrets que l'app principale.

Les secrets sont partagés entre tous les processus de l'app.

## Problèmes courants

### Le worker s'arrête quand l'app web s'arrête

Solution : Vérifier que vous avez bien créé une machine dédiée :
```bash
fly scale count worker=1
```

### Le worker ne démarre pas

Vérifier les logs :
```bash
fly logs --app vinted-last -a worker
```

Vérifier que les secrets sont bien configurés :
```bash
fly secrets list
```

### Erreur 403 détectée

Le worker gère automatiquement les erreurs 403 :
1. Arrêt du cycle d'alertes
2. Attente de 30 minutes
3. Génération automatique de nouveaux cookies via Cookie Factory
4. Relance du cycle d'alertes

Vérifier les logs pour voir le processus :
```bash
fly logs --app vinted-last -a worker
```

