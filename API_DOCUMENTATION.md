# API Rezo - Documentation

## Vue d'ensemble

L'API Rezo est une API REST pour la plateforme musicale émotionnelle Rezo. Elle permet aux utilisateurs de se connecter via magic links, de gérer leurs préférences musicales et de découvrir de la musique basée sur leur humeur.

## Base URL

- **Développement** : `http://localhost:5001/api`
- **Production** : `https://your-domain.com/api`

## Authentification

L'API utilise un système d'authentification par magic links (sans mot de passe) avec des tokens JWT.

### Flux d'authentification

1. **Demande de magic link** : `POST /auth/request-magic-link`
2. **Vérification du magic link** : `POST /auth/verify-magic-link`
3. **Utilisation du token JWT** : Inclure `Authorization: Bearer <token>` dans les requêtes

## Endpoints

### Authentification

#### POST /auth/request-magic-link

Demande un magic link pour se connecter.

**Body :**

```json
{
  "email": "user@example.com"
}
```

**Réponse :**

```json
{
  "message": "Magic link envoyé avec succès",
  "email": "user@example.com"
}
```

#### POST /auth/verify-magic-link

Vérifie un magic link et retourne un token JWT.

**Body :**

```json
{
  "token": "magic-link-token",
  "email": "user@example.com",
  "pseudo": "username" // Requis pour les nouveaux utilisateurs
}
```

**Réponse :**

```json
{
  "message": "Connexion réussie",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "pseudo": "username",
    "avatar": "avatar-url",
    "isVerified": true,
    "preferences": {
      "preferredGenres": [],
      "musicInteractions": [],
      "moodHistory": [],
      "onboardingCompleted": false
    }
  }
}
```

#### GET /auth/me

Récupère les informations de l'utilisateur connecté.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Réponse :**

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "pseudo": "username",
    "avatar": "avatar-url",
    "isVerified": true,
    "preferences": {
      "preferredGenres": [],
      "musicInteractions": [],
      "moodHistory": [],
      "onboardingCompleted": false
    },
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "loginCount": 1
  }
}
```

#### POST /auth/logout

Déconnexion de l'utilisateur.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Réponse :**

```json
{
  "message": "Déconnexion réussie"
}
```

### Utilisateurs

#### GET /users/profile

Récupère le profil complet de l'utilisateur.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Réponse :**

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "pseudo": "username",
    "avatar": "avatar-url",
    "preferences": {
      "preferredGenres": [
        {
          "id": "genre-id",
          "title": "Pop",
          "type": "genre",
          "spotifyGenres": ["pop"],
          "audioFeatures": {
            "danceability": 0.8,
            "energy": 0.7,
            "valence": 0.9
          },
          "selectedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "musicInteractions": [],
      "moodHistory": [
        {
          "mood": "happy",
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
      ],
      "onboardingCompleted": true
    }
  }
}
```

#### PUT /users/profile

Met à jour le profil de l'utilisateur.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Body :**

```json
{
  "pseudo": "new-username",
  "avatar": "new-avatar-url"
}
```

**Réponse :**

```json
{
  "message": "Profil mis à jour",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "pseudo": "new-username",
    "avatar": "new-avatar-url",
    "preferences": {
      // ... préférences mises à jour
    }
  }
}
```

#### POST /users/mood

Enregistre une humeur de l'utilisateur.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Body :**

```json
{
  "mood": "happy"
}
```

**Réponse :**

```json
{
  "message": "Humeur enregistrée",
  "mood": "happy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /users/mood-history

Récupère l'historique des humeurs de l'utilisateur.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Réponse :**

```json
{
  "moodHistory": [
    {
      "mood": "happy",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "mood": "sad",
      "timestamp": "2024-01-01T01:00:00.000Z"
    }
  ]
}
```

#### DELETE /users/account

Supprime le compte de l'utilisateur.

**Headers :**

```
Authorization: Bearer <jwt-token>
```

**Réponse :**

```json
{
  "message": "Compte supprimé avec succès"
}
```

### Monitoring

#### GET /health

Vérifie la santé de l'API.

**Réponse :**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "mongodb": {
      "status": "healthy",
      "readyState": 1
    },
    "memory": {
      "status": "healthy",
      "usage": "45.2MB"
    },
    "errorRate": {
      "status": "healthy",
      "rate": "0.5%"
    }
  }
}
```

#### GET /metrics

Récupère les métriques de l'API.

**Réponse :**

```json
{
  "requests": {
    "total": 1000,
    "successful": 950,
    "failed": 50,
    "byMethod": {
      "GET": 800,
      "POST": 150,
      "PUT": 30,
      "DELETE": 20
    },
    "byRoute": {
      "/api/auth/me": 200,
      "/api/users/profile": 150
    },
    "byStatus": {
      "200": 800,
      "201": 150,
      "400": 30,
      "500": 20
    }
  },
  "performance": {
    "responseTime": [100, 150, 200],
    "memoryUsage": [
      {
        "timestamp": 1640995200000,
        "rss": 47185920,
        "heapUsed": 20971520
      }
    ]
  },
  "errors": {
    "total": 50,
    "byType": {
      "ValidationError": 30,
      "AuthenticationError": 20
    },
    "byRoute": {
      "/api/auth/verify-magic-link": 20,
      "/api/users/profile": 30
    }
  }
}
```

## Codes d'erreur

| Code | Description            |
| ---- | ---------------------- |
| 400  | Données invalides      |
| 401  | Token d'accès requis   |
| 403  | Accès non autorisé     |
| 404  | Ressource non trouvée  |
| 409  | Conflit de ressources  |
| 429  | Trop de requêtes       |
| 500  | Erreur serveur interne |

## Rate Limiting

- **Général** : 100 requêtes par 15 minutes
- **Magic links** : 3 requêtes par 15 minutes
- **Connexion** : 5 tentatives par 15 minutes
- **API** : 60 requêtes par minute

## Exemples d'utilisation

### JavaScript (Fetch)

```javascript
// Demande de magic link
const response = await fetch("/api/auth/request-magic-link", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
  }),
});

// Vérification du magic link
const verifyResponse = await fetch("/api/auth/verify-magic-link", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    token: "magic-link-token",
    email: "user@example.com",
    pseudo: "username",
  }),
});

const { token } = await verifyResponse.json();

// Requête authentifiée
const profileResponse = await fetch("/api/users/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### cURL

```bash
# Demande de magic link
curl -X POST http://localhost:5001/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Vérification du magic link
curl -X POST http://localhost:5001/api/auth/verify-magic-link \
  -H "Content-Type: application/json" \
  -d '{"token": "magic-link-token", "email": "user@example.com", "pseudo": "username"}'

# Requête authentifiée
curl -X GET http://localhost:5001/api/users/profile \
  -H "Authorization: Bearer jwt-token"
```

## Changelog

### Version 1.0.0

- Authentification par magic links
- Gestion des utilisateurs et préférences
- Système de monitoring et métriques
- Rate limiting et sécurité renforcée
