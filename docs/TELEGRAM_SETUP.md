# Configuration des notifications Telegram

Ce guide explique comment configurer les notifications Telegram pour recevoir des alertes lorsqu'un nouvel item correspondant à vos alertes est détecté.

## Prérequis

1. Un compte Telegram
2. Un bot Telegram (créé via [@BotFather](https://t.me/botfather))

## Étapes de configuration

### 1. Créer un bot Telegram

1. Ouvrez Telegram et recherchez [@BotFather](https://t.me/botfather)
2. Envoyez la commande `/newbot`
3. Suivez les instructions pour donner un nom et un username à votre bot
4. BotFather vous donnera un **token** (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Sauvegardez ce token** - vous en aurez besoin pour la configuration

### 2. Obtenir votre Chat ID

Il existe plusieurs méthodes pour obtenir votre Chat ID :

#### Méthode 1 : Via un bot existant
1. Recherchez [@userinfobot](https://t.me/userinfobot) sur Telegram
2. Démarrer une conversation avec ce bot
3. Il vous donnera votre Chat ID (ex: `123456789`)

#### Méthode 2 : Via votre bot
1. Envoyez un message à votre bot
2. Visitez cette URL dans votre navigateur (remplacez `YOUR_BOT_TOKEN` par votre token) :
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Cherchez `"chat":{"id":` dans la réponse JSON
4. Le nombre après `"id":` est votre Chat ID

### 3. Configurer les variables d'environnement

Ajoutez les variables suivantes à votre fichier `.env.local` (ou `.env` selon votre configuration) :

```env
TELEGRAM_BOT_TOKEN=votre_token_bot_ici
TELEGRAM_CHAT_ID=votre_chat_id_ici
```

**Exemple :**
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### 4. Redémarrer l'application

Après avoir ajouté les variables d'environnement, redémarrez votre application pour que les changements prennent effet.

## Fonctionnement

- Les notifications sont envoyées **uniquement pour les nouveaux items** détectés
- Un item est considéré comme "nouveau" s'il n'existe pas encore dans la table `alert_matches` pour cette alerte
- Une fois qu'un item a été notifié, il ne sera plus notifié à nouveau (même si l'alerte est vérifiée plusieurs fois)

## Format des notifications

Les notifications Telegram contiennent :
- 🎮 Le titre de l'alerte
- 🎯 Le titre de l'item
- 💰 Le prix
- 📦 La condition de l'item
- 🔗 Le lien vers l'item sur Vinted
- ℹ️ La raison du match

## Dépannage

### Les notifications ne sont pas envoyées

1. **Vérifiez les variables d'environnement** : Assurez-vous que `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID` sont bien définies
2. **Vérifiez les logs** : Les erreurs de notification sont loggées dans les logs de l'application
3. **Testez votre bot** : Envoyez un message à votre bot pour vérifier qu'il fonctionne
4. **Vérifiez votre Chat ID** : Assurez-vous d'avoir utilisé le bon Chat ID

### Erreur "Unauthorized"

- Vérifiez que votre `TELEGRAM_BOT_TOKEN` est correct
- Assurez-vous que le token n'a pas été révoqué

### Erreur "Chat not found"

- Vérifiez que votre `TELEGRAM_CHAT_ID` est correct
- Assurez-vous d'avoir envoyé au moins un message à votre bot avant d'utiliser le Chat ID

## Sécurité

⚠️ **Important** : Ne partagez jamais votre `TELEGRAM_BOT_TOKEN` publiquement. Gardez-le secret et ne le commitez jamais dans votre dépôt Git.

