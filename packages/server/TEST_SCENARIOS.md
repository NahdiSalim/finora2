# Scénarios de Tests — Finora API

> Base URL : `http://localhost:3000/api`
> Auth : Bearer token JWT (obtenu via `POST /auth/login`)

---

## Comptes de test

| Rôle          | Email                   | Mot de passe |
| ------------- | ----------------------- | ------------ |
| ADMINISTRATOR | admin@finora.com        | password123  |
| ACCOUNTANT    | accountant@finora.com   | password123  |
| COLLABORATOR  | collaborator@finora.com | password123  |
| CLIENT        | client@finora.com       | password123  |

---

## 1. AUTHENTIFICATION (`/auth`)

### 1.1 Connexion

- **POST /auth/login**
  - ✅ Email + mot de passe valides → token JWT retourné
  - ❌ Mauvais mot de passe → 401
  - ❌ Email inexistant → 401
  - ❌ Compte suspendu → 403

### 1.2 Déconnexion

- **POST /auth/logout**
  - ✅ refreshToken valide → déconnexion réussie
  - ❌ refreshToken invalide → 400

### 1.3 Utilisateur connecté

- **GET /auth/me**
  - ✅ Token valide → retourne user + features + permissions
  - ❌ Sans token → 401

### 1.4 Mot de passe oublié

- **POST /auth/forgot-password** `{ "email": "..." }`
  - ✅ Email existant → email envoyé
  - ❌ Email inexistant → 404

### 1.5 Réinitialisation mot de passe

- **POST /auth/reset-password/:token** `{ "password": "...", "confirmepassword": "..." }`
  - ✅ Token valide + mots de passe identiques → succès
  - ❌ Token expiré → 400
  - ❌ Mots de passe différents → 400

### 1.6 Inscription client

- **POST /auth/register/client**
  - ✅ Données valides → compte créé (status: pending)
  - ❌ Email déjà utilisé → 400

### 1.7 Inscription comptable

- **POST /auth/register/accountant** (multipart)
  - ✅ Données valides + fichiers → compte créé (status: pending)
  - ❌ Email déjà utilisé → 400

---

## 2. UTILISATEURS (`/users`)

### 2.1 Liste des utilisateurs

- **GET /users?page=1&limit=10**
  - ✅ Retourne liste paginée avec `counts` par rôle
  - ✅ `?role=ACCOUNTANT` → filtre par rôle
  - ✅ `?status=active` → filtre par statut
  - ✅ `?search=ahmed` → recherche par nom/email

### 2.2 Détail utilisateur

- **GET /users/:id**
  - ✅ ID existant → retourne user + company + documents
  - ❌ ID inexistant → 404

### 2.3 Créer utilisateur

- **POST /users** `{ "email": "...", "username": "...", ... }`
  - ✅ Données valides → utilisateur créé
  - ❌ Email déjà utilisé → 409

### 2.4 Activer / Suspendre

- **PUT /users/:id/status?action=activate** (ADMINISTRATOR)
  - ✅ Utilisateur existant → activé
  - ❌ Administrateur → 403
- **PUT /users/:id/status?action=suspend** `{ "reason": "..." }`
  - ✅ Utilisateur existant → suspendu
  - ❌ Administrateur → 403

### 2.5 Mettre à jour profil

- **PATCH /users/profile** (multipart: photo, coverPhoto)
  - ✅ Données valides → profil mis à jour
- **PATCH /users/profile/complete** (multipart: tous les fichiers)
  - ✅ Mise à jour complète user + company

### 2.6 Exporter

- **GET /users/export?lang=fr**
  - ✅ Retourne fichier CSV

### 2.7 Supprimer

- **DELETE /users/:id**
  - ✅ ID existant → supprimé
  - ❌ ID inexistant → 404

---

## 3. ADMIN (`/admin/users`)

### 3.1 Comptables en attente

- **GET /admin/users/pending**
  - ✅ Retourne liste des comptes pending

### 3.2 Tous les comptables

- **GET /admin/users?search=...&page=1&limit=10**
  - ✅ Liste paginée avec recherche

### 3.3 Créer comptable

- **POST /admin/users/accountants** (multipart)
  - ✅ Données valides → compte créé + email envoyé
  - ❌ Email existant → 400

### 3.4 Activer / Suspendre comptable

- **PUT /admin/users/:id/activate** → activé
- **PUT /admin/users/:id/suspend** `{ "reason": "..." }` → suspendu

---

## 4. RENDEZ-VOUS (`/appointments`)

### 4.1 Créer un rendez-vous

- **POST /appointments**
  ```json
  {
    "title": "Consultation fiscale",
    "date": "2026-05-10",
    "hour": "09:00",
    "accountantId": 2,
    "meetingType": "in_person",
    "color": "#1976d2",
    "guests": ["guest@example.com"]
  }
  ```

  - ✅ Date dans les disponibilités du comptable → créé
  - ❌ Comptable non disponible à cette date → 400 `ACCOUNTANT_NOT_AVAILABLE`
  - ❌ Heure hors plage → 400 `HOUR_OUT_OF_AVAILABILITY`

### 4.2 Mes rendez-vous (CLIENT)

- **GET /appointments/my-appointments**
  - ✅ `?period=today` → RDV d'aujourd'hui
  - ✅ `?period=upcoming` → RDV à venir
  - ✅ `?period=past` → RDV passés
  - ✅ `?status=confirmed` → filtre par statut
  - ✅ `?search=consultation` → recherche par titre/nom

### 4.3 Tous les rendez-vous (ACCOUNTANT)

- **GET /appointments/all**
  - ✅ Retourne RDV de la compagnie + RDV directs
  - ✅ Inclut `reported: true/false`

### 4.4 Confirmer / Refuser

- **POST /appointments/:id/respond** `{ "action": "confirm" }`
  - ✅ RDV pending → confirmé, notification envoyée
- **POST /appointments/:id/respond** `{ "action": "reject", "rejectionReason": "..." }`
  - ✅ RDV pending → refusé
  - ❌ RDV déjà confirmé → 400 `INVALID_STATUS`

### 4.5 Reporter un RDV

- **POST /appointments/:id/report**
  ```json
  { "newDate": "2026-05-15", "newHour": "14:00", "reason": "Indisponibilité" }
  ```

  - ✅ RDV reporté → statut repasse à `pending`, historique enregistré

### 4.6 Historique des reports

- **GET /appointments/:id/history**
  - ✅ Retourne liste des reports avec date/heure avant/après

### 4.7 Annuler

- **POST /appointments/:id/cancel**
  - ✅ RDV annulé, notification envoyée

### 4.8 RDV du mois (confirmés)

- **GET /appointments/confirmed/this-month**
  - ✅ Retourne RDV confirmés du mois en cours

### 4.9 Créneaux disponibles

- **GET /appointments/slots/available?accountantId=2&date=2026-05-10**
  - ✅ Retourne créneaux non réservés
  - ✅ Date en congé → retourne `[]` + `leaveReason`

---

## 5. DISPONIBILITÉS (`/appointments/availability`)

### 5.1 Créer disponibilité (ACCOUNTANT)

- **POST /appointments/availability**
  ```json
  {
    "isRecurring": true,
    "dayOfWeek": "lundi",
    "startTime": "09:00",
    "endTime": "17:00",
    "slotDuration": 60
  }
  ```

  - ✅ Données valides → créé
  - ❌ startTime >= endTime → 400

### 5.2 Mes disponibilités

- **GET /appointments/availability/mine**
  - ✅ Retourne liste des règles actives

### 5.3 Disponibilités d'un comptable (CLIENT)

- **GET /appointments/availability/:accountantId**
  - ✅ Retourne disponibilités publiques

---

## 6. CONGÉS (`/appointments/leaves`)

### 6.1 Déclarer un congé (ACCOUNTANT)

- **POST /appointments/leaves**
  ```json
  { "startDate": "2026-08-01", "endDate": "2026-08-15", "reason": "Vacances" }
  ```

  - ✅ Dates valides → congé créé
  - ❌ startDate > endDate → 400

### 6.2 Mes congés

- **GET /appointments/leaves/mine**
  - ✅ Retourne liste des congés

### 6.3 Supprimer un congé

- **DELETE /appointments/leaves/:id**
  - ✅ Congé supprimé
  - ❌ Congé d'un autre comptable → 403

---

## 7. DOCUMENTS (`/documents`)

### 7.1 Créer un dossier

- **POST /documents/folders** `{ "name": "Factures 2026", "parentId": null }`
  - ✅ Dossier créé

### 7.2 Uploader un fichier

- **POST /documents/upload** (multipart: file, category, parentId)
  - ✅ Fichier uploadé → document créé
  - ❌ Sans fichier → 400

### 7.3 Liste des documents

- **GET /documents/client?page=1&limit=20**
  - ✅ Retourne documents de la compagnie
  - ✅ `?search=facture` → recherche récursive
  - ✅ `?category=facture` → filtre par catégorie
  - ✅ `?startDate=2026-01-01&endDate=2026-12-31` → filtre par date

### 7.4 Détail document

- **GET /documents/:id**
  - ✅ Retourne détails + URL signée
  - ❌ Document d'une autre compagnie → 403

### 7.5 Télécharger

- **GET /documents/:id/download**
  - ✅ Stream du fichier

### 7.6 Archiver / Désarchiver

- **POST /documents/:id/archive** → archivé (avec enfants)
- **POST /documents/:id/unarchive** → désarchivé

### 7.7 Supprimer

- **DELETE /documents/:id**
  - ✅ Supprimé
  - ❌ Dossier non vide → 400

---

## 8. VERSIONS DE DOCUMENTS (`/documents/:id/versions`)

### 8.1 Historique des versions

- **GET /documents/:documentId/versions**
  - ✅ Retourne liste des versions avec numéro, date, auteur

### 8.2 Nouvelle version

- **POST /documents/:documentId/versions** (multipart: file, comment)
  - ✅ Nouvelle version créée, `currentVersion` incrémenté

### 8.3 Restaurer une version

- **POST /documents/:documentId/versions/:versionId/restore**
  - ✅ Version restaurée comme version courante

---

## 9. FACTURES (`/invoices`)

### 9.1 Extraire métadonnées

- **POST /invoices/extract/:documentId**
  - ✅ Document PDF → métadonnées extraites (bgm, lin_section, invoice_moa...)
  - ❌ Document non PDF → erreur extraction

### 9.2 Voir métadonnées

- **GET /invoices/metadata/:documentId**
  - ✅ Retourne rawData JSON

### 9.3 Sauvegarder

- **POST /invoices/save/:documentId** `{ "extractedData": { ... } }`
  - ✅ Données sauvegardées, status → `enregistre`
  - ✅ Totaux recalculés, warnings si écart

### 9.4 Synchroniser

- **POST /invoices/synchronize/:documentId**
  - ✅ Status → `synchronise`
  - ❌ Status != `enregistre` → erreur

### 9.5 Liste par statut

- **GET /invoices/status?processingStatus=traite&page=1**
  - ✅ Retourne documents filtrés par statut

---

## 10. TÂCHES (`/tasks`)

### 10.1 Créer une tâche (ACCOUNTANT)

- **POST /tasks** (multipart)
  ```json
  {
    "title": "Préparer bilan Q1",
    "assigneeId": 3,
    "priority": "high",
    "dueDate": "2026-04-30"
  }
  ```

  - ✅ Tâche créée, notification envoyée au collaborateur

### 10.2 Mes tâches (COLLABORATOR)

- **GET /tasks/my-tasks?status=todo&priority=high**
  - ✅ Retourne tâches assignées filtrées

### 10.3 Cycle de vie d'une tâche

- **PUT /tasks/:id/start** → `in_progress`
- **PUT /tasks/:id/review** → soumis pour révision
- **POST /tasks/:id/validate** `{ "approved": true }` → `completed`
- **POST /tasks/:id/validate** `{ "approved": false, "comment": "..." }` → retour en `todo`

### 10.4 Réorganiser (drag & drop)

- **PUT /tasks/reorder/bulk** `{ "tasks": [{ "id": 1, "order": 0 }, ...], "status": "todo" }`
  - ✅ Ordre mis à jour

---

## 11. DEMANDES (`/requests`)

### 11.1 Créer une demande (CLIENT)

- **POST /requests** (multipart)
  ```json
  { "subject": "Demande de bilan", "description": "...", "urgency": "high" }
  ```

  - ✅ Demande créée, notification au comptable

### 11.2 Mes demandes (CLIENT)

- **GET /requests/my-requests?status=pending**
  - ✅ Retourne demandes filtrées

### 11.3 Répondre (ACCOUNTANT)

- **POST /requests/:id/respond** `{ "status": "resolved", "response": "..." }`
  - ✅ Demande résolue, notification au client

### 11.4 Convertir en tâche (ACCOUNTANT)

- **POST /requests/:id/convert-to-task** `{ "assigneeId": 3, "dueDate": "..." }`
  - ✅ Tâche créée depuis la demande

---

## 12. RELATIONS (`/relationships`)

### 12.1 Envoyer une invitation

- **POST /relationships/invitations**
  ```json
  { "targetCompanyId": 5, "message": "Bonjour, je souhaite collaborer avec vous." }
  ```

  - ✅ Invitation envoyée
  - ❌ Relation déjà existante → 400

### 12.2 Répondre à une invitation

- **PUT /relationships/invitations/:id/respond** `{ "action": "accept" }`
  - ✅ Relation activée
- **PUT /relationships/invitations/:id/respond** `{ "action": "reject" }`
  - ✅ Invitation refusée

### 12.3 Relations actives

- **GET /relationships/active**
  - ✅ Retourne liste des relations actives

### 12.4 Résilier

- **PUT /relationships/:id/terminate** `{ "reason": "..." }`
  - ✅ Relation terminée

---

## 13. COMPTABLE (`/accountant`)

### 13.1 Créer un collaborateur

- **POST /accountant/collaborators**
  ```json
  { "email": "collab@firm.com", "firstName": "Jean", "lastName": "Dupont" }
  ```

  - ✅ Compte créé + email avec mot de passe temporaire

### 13.2 Créer un client

- **POST /accountant/clients** (multipart)
  - ✅ Client créé + relation établie automatiquement

### 13.3 Liste des clients

- **GET /accountant/clients?page=1&limit=10**
  - ✅ Retourne clients avec `id` = userId (pas companyId)

### 13.4 Mes comptables (CLIENT)

- **GET /accountant/my-accountants**
  - ✅ Retourne comptables en relation active

### 13.5 Profil public (PUBLIC)

- **GET /public/accountants?search=...&location=Tunis**
  - ✅ Retourne profils publics filtrés

---

## 14. AVIS (`/reviews`)

### 14.1 Laisser un avis (CLIENT)

- **POST /reviews/accountant/:accountantId**
  ```json
  { "rating": 5, "comment": "Excellent service" }
  ```

  - ✅ Avis créé
  - ❌ Pas de relation active → 403

### 14.2 Répondre à un avis (ACCOUNTANT)

- **POST /reviews/:reviewId/respond** `{ "response": "Merci !" }`
  - ✅ Réponse enregistrée

---

## 15. CHAT (`/chat`)

### 15.1 Créer une salle

- **POST /chat/rooms** `{ "name": "Projet Bilan", "participantIds": [2, 3] }`
  - ✅ Salle créée

### 15.2 Envoyer un message

- **POST /chat/messages** (multipart)
  ```json
  { "roomId": 1, "content": "Bonjour !" }
  ```

  - ✅ Message envoyé, notification temps réel (WebSocket)

### 15.3 Historique messages

- **GET /chat/rooms/:id/messages?page=1&limit=50**
  - ✅ Messages paginés

---

## 16. NOTIFICATIONS (`/notifications`)

### 16.1 Mes notifications

- **GET /notifications?read=false&limit=20**
  - ✅ Retourne notifications non lues

### 16.2 Marquer comme lu

- **PATCH /notifications/:id/read** → lu
- **POST /notifications/mark-all-read** → toutes lues

### 16.3 Compteur non lus

- **GET /notifications/unread-count**
  - ✅ Retourne `{ count: N }`

---

## 17. RÔLES (`/role`)

### 17.1 Permissions d'un rôle

- **GET /role/:id/permissions**
  - ✅ Retourne actions groupées par feature/page

### 17.2 Mettre à jour permissions

- **PUT /role/:id/permissions** `{ "actionIds": [1, 2, 3] }`
  - ✅ Permissions remplacées

---

## 18. STOCKAGE (`/storage`)

### 18.1 Mon utilisation

- **GET /storage/usage**
  - ✅ Retourne `{ used, total, percentage }`

### 18.2 Alertes (ADMINISTRATOR)

- **GET /storage/alerts**
  - ✅ Retourne compagnies > 80% de leur quota

---

## 19. AUDIT (`/audit`)

### 19.1 Rechercher dans les logs

- **GET /audit/logs?entity=appointment&startDate=2026-01-01**
  - ✅ Retourne logs filtrés

### 19.2 Statistiques

- **GET /audit/statistics**
  - ✅ Retourne stats par action/entité

---

## 20. LOCALISATION (`/location`)

### 20.1 Pays

- **GET /location/countries?search=Tun**
  - ✅ Retourne pays filtrés en français

### 20.2 États / Gouvernorats

- **GET /location/states?countryCode=TN**
  - ✅ Retourne gouvernorats de Tunisie

---

## Codes d'erreur communs

| Code HTTP | Signification                      |
| --------- | ---------------------------------- |
| 400       | Données invalides / règle métier   |
| 401       | Non authentifié                    |
| 403       | Accès refusé (rôle ou permission)  |
| 404       | Ressource introuvable              |
| 409       | Conflit (email déjà utilisé, etc.) |
| 500       | Erreur serveur interne             |
