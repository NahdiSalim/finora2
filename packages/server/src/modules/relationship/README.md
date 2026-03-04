# Module Relationship - Gestion des Relations Client-Comptable

## Description

Ce module gère le système d'invitations et de relations entre clients et comptables. Il permet:

- Envoi d'invitations (Client → Comptable ou Comptable → Client)
- Acceptation/Refus des invitations
- Gestion des relations actives
- Résiliation des relations
- Historique complet

## Flux de travail

### 1. Envoi d'invitation

```
Client/Comptable → Envoie invitation → Notification envoyée → Statut: pending
```

### 2. Réponse à l'invitation

```
Destinataire → Accepte → Statut: active → Relation établie
              OU
Destinataire → Refuse → Statut: rejected → Fin
```

### 3. Relation active

```
Les deux parties peuvent:
- Discuter (chat)
- Gérer des demandes
- Prendre des rendez-vous
- Partager des documents
- Gérer des tâches
```

### 4. Résiliation

```
Client/Comptable → Résilie → Statut: terminated → Relation terminée
```

## API Endpoints

### 1. Envoyer une invitation

```http
POST /api/relationships/invitations
Authorization: Bearer {token}
```

**Body:**

```json
{
  "targetCompanyId": 5,
  "invitationMessage": "Je souhaiterais établir une relation professionnelle..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Invitation envoyée avec succès",
  "invitation": {
    "id": 1,
    "clientCompanyId": 2,
    "accountingFirmId": 5,
    "invitedBy": 3,
    "invitationType": "client_to_accountant",
    "status": "pending",
    "invitationMessage": "Je souhaiterais...",
    "requestDate": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Obtenir les invitations en attente

```http
GET /api/relationships/invitations
Authorization: Bearer {token}
```

**Response:**

```json
{
  "received": [
    {
      "id": 1,
      "clientCompany": {
        "id": 2,
        "name": "Entreprise ABC",
        "logo": "..."
      },
      "accountingFirm": {
        "id": 5,
        "name": "Cabinet XYZ",
        "logo": "..."
      },
      "invitationType": "client_to_accountant",
      "invitationMessage": "...",
      "requestDate": "2024-01-15T10:00:00Z"
    }
  ],
  "sent": [...]
}
```

### 3. Répondre à une invitation

```http
PUT /api/relationships/invitations/:invitationId/respond
Authorization: Bearer {token}
```

**Body (Accepter):**

```json
{
  "response": "accept"
}
```

**Body (Refuser):**

```json
{
  "response": "reject",
  "rejectionReason": "Nous ne pouvons pas accepter de nouveaux clients..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Invitation acceptée. La relation est maintenant active.",
  "relationship": {
    "id": 1,
    "status": "active",
    "relationshipStart": "2024-01-15T11:00:00Z"
  }
}
```

### 4. Obtenir les relations actives

```http
GET /api/relationships/active
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": 1,
    "clientCompany": {
      "id": 2,
      "name": "Entreprise ABC",
      "logo": "...",
      "email": "contact@abc.com",
      "phone": "+33123456789"
    },
    "accountingFirm": {
      "id": 5,
      "name": "Cabinet XYZ",
      "logo": "...",
      "email": "contact@xyz.com",
      "phone": "+33987654321"
    },
    "status": "active",
    "relationshipStart": "2024-01-15T11:00:00Z"
  }
]
```

### 5. Résilier une relation

```http
PUT /api/relationships/:relationshipId/terminate
Authorization: Bearer {token}
```

**Body:**

```json
{
  "terminationReason": "Changement de prestataire comptable"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Relation résiliée avec succès",
  "relationship": {
    "id": 1,
    "status": "terminated",
    "terminationReason": "Changement de prestataire comptable",
    "terminatedAt": "2024-01-20T14:00:00Z",
    "relationshipEnd": "2024-01-20T14:00:00Z"
  }
}
```

### 6. Obtenir l'historique

```http
GET /api/relationships/history
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": 2,
    "status": "rejected",
    "rejectionReason": "...",
    "responseDate": "2024-01-10T12:00:00Z"
  },
  {
    "id": 3,
    "status": "terminated",
    "terminationReason": "...",
    "terminatedAt": "2024-01-05T15:00:00Z"
  }
]
```

## Statuts des relations

| Statut       | Description                                  |
| ------------ | -------------------------------------------- |
| `pending`    | Invitation envoyée, en attente de réponse    |
| `accepted`   | Invitation acceptée (transition vers active) |
| `rejected`   | Invitation refusée                           |
| `active`     | Relation active et fonctionnelle             |
| `terminated` | Relation résiliée                            |

## Types d'invitation

- `client_to_accountant`: Client envoie une invitation à un comptable
- `accountant_to_client`: Comptable envoie une invitation à un client

## Notifications

Le système envoie automatiquement des notifications pour:

- ✅ Nouvelle invitation reçue
- ✅ Invitation acceptée
- ✅ Invitation refusée
- ✅ Relation résiliée

## Règles métier

1. **Unicité**: Une seule relation active possible entre un client et un comptable
2. **Bidirectionnel**: Client ou comptable peut initier la relation
3. **Autorisation**: Seules les parties concernées peuvent gérer la relation
4. **Traçabilité**: Tous les événements sont enregistrés (qui, quand, pourquoi)
5. **Notifications**: Toutes les actions importantes déclenchent des notifications

## Intégration avec d'autres modules

Une fois la relation active, les utilisateurs peuvent:

- 💬 **Chat**: Discuter via le module Chat
- 📋 **Demandes**: Créer et gérer des demandes via le module Request
- 📅 **Rendez-vous**: Prendre des rendez-vous via le module Appointment
- 📄 **Documents**: Partager des documents via le module Document
- ✅ **Tâches**: Assigner et suivre des tâches via le module Task

## Sécurité

- ✅ Authentification JWT requise
- ✅ Vérification des autorisations (seules les parties concernées)
- ✅ Validation des données avec class-validator
- ✅ Contrainte d'unicité en base de données
- ✅ Traçabilité complète (qui a fait quoi et quand)

## Synchronisation Prisma

Après avoir créé ce module, exécutez:

```bash
cd packages/server
node scripts/merge-prisma-models.js
npx prisma generate
npx prisma db push
```

Puis rechargez VSCode pour mettre à jour les types TypeScript.
