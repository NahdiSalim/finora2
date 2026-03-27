# Scénarios de Tests Frontend — Finora

> Tests fonctionnels à exécuter directement sur l'interface.
> Chaque scénario décrit les étapes, le résultat attendu et le résultat en cas d'erreur.

---

## Comptes de test

| Rôle          | Email                | Mot de passe |
| ------------- | -------------------- | ------------ |
| ADMINISTRATOR | admin@finora.com     | password123  |
| ACCOUNTANT    | comptable@finora.com | password123  |
| COLLABORATEUR | collab@finora.com    | password123  |
| CLIENT        | client@finora.com    | password123  |

---

## MODULE 1 — AUTHENTIFICATION

### SC-AUTH-01 : Connexion réussie

**Rôle :** Tous
**Étapes :**

1. Aller sur la page de connexion
2. Saisir un email et mot de passe valides
3. Cliquer sur "Se connecter"

**Résultat attendu :** Redirection vers le tableau de bord selon le rôle
**Résultat en erreur :** Message "E-mail ou mot de passe incorrect"

---

### SC-AUTH-02 : Connexion avec compte suspendu

**Rôle :** Tous
**Étapes :**

1. Saisir les identifiants d'un compte suspendu
2. Cliquer sur "Se connecter"

**Résultat attendu :** Message "Votre compte a été suspendu. Contactez votre administrateur."

---

### SC-AUTH-03 : Mot de passe oublié

**Étapes :**

1. Cliquer sur "Mot de passe oublié"
2. Saisir l'email du compte
3. Cliquer sur "Envoyer"

**Résultat attendu :** Message de confirmation + email reçu avec lien de réinitialisation
**Résultat en erreur :** Email inexistant → message d'erreur

---

### SC-AUTH-04 : Réinitialisation du mot de passe

**Étapes :**

1. Cliquer sur le lien reçu par email
2. Saisir un nouveau mot de passe
3. Confirmer le mot de passe
4. Valider

**Résultat attendu :** Mot de passe changé, redirection vers connexion
**Résultat en erreur :** Mots de passe différents → message d'erreur

---

### SC-AUTH-05 : Déconnexion

**Étapes :**

1. Cliquer sur l'avatar ou menu utilisateur
2. Cliquer sur "Déconnexion"

**Résultat attendu :** Redirection vers la page de connexion, session effacée

---

## MODULE 2 — INSCRIPTION

### SC-REG-01 : Inscription client

**Étapes :**

1. Aller sur la page d'inscription client
2. Remplir : nom, prénom, email, mot de passe, nom de l'entreprise, SIRET
3. Valider

**Résultat attendu :** Message "Compte créé, en attente d'activation"
**Résultat en erreur :** Email déjà utilisé → message d'erreur

---

### SC-REG-02 : Inscription comptable

**Étapes :**

1. Aller sur la page d'inscription comptable
2. Remplir toutes les informations + uploader le fichier de patente
3. Valider

**Résultat attendu :** Message "Compte créé, en attente de validation par l'administrateur"

---

## MODULE 3 — GESTION DES UTILISATEURS (ADMINISTRATOR)

### SC-USER-01 : Voir la liste des utilisateurs

**Rôle :** ADMINISTRATOR
**Étapes :**

1. Aller dans "Gestion des utilisateurs"
2. Observer la liste

**Résultat attendu :** Liste paginée avec compteurs par rôle (X comptables, Y clients, Z collaborateurs)

---

### SC-USER-02 : Filtrer les utilisateurs

**Étapes :**

1. Utiliser le filtre "Rôle" → sélectionner "Comptable"
2. Utiliser le filtre "Statut" → sélectionner "Actif"
3. Utiliser la barre de recherche → taper un nom

**Résultat attendu :** Liste filtrée en temps réel

---

### SC-USER-03 : Voir le détail d'un utilisateur

**Étapes :**

1. Cliquer sur un utilisateur dans la liste

**Résultat attendu :** Page avec toutes les infos : profil, entreprise, documents

---

### SC-USER-04 : Activer un compte

**Étapes :**

1. Trouver un utilisateur avec statut "En attente" ou "Suspendu"
2. Cliquer sur "Activer"
3. Confirmer

**Résultat attendu :** Statut passe à "Actif", email de confirmation envoyé à l'utilisateur

---

### SC-USER-05 : Suspendre un compte

**Étapes :**

1. Trouver un utilisateur actif
2. Cliquer sur "Suspendre"
3. Saisir une raison (optionnel)
4. Confirmer

**Résultat attendu :** Statut passe à "Suspendu"
**Résultat en erreur :** Tentative de suspendre un administrateur → message d'erreur

---

## MODULE 4 — RENDEZ-VOUS (CLIENT)

### SC-APT-01 : Prendre un rendez-vous

**Rôle :** CLIENT
**Étapes :**

1. Aller dans "Mes rendez-vous"
2. Cliquer sur "Nouveau rendez-vous"
3. Saisir : titre, date, heure, type de réunion
4. Sélectionner un comptable
5. Ajouter une couleur et des invités (optionnel)
6. Valider

**Résultat attendu :** Rendez-vous créé avec statut "En attente", notification envoyée au comptable
**Résultat en erreur :** Date hors disponibilités → message "Le comptable n'est pas disponible à cette date"

---

### SC-APT-02 : Voir les créneaux disponibles

**Étapes :**

1. Dans le formulaire de création, sélectionner un comptable et une date
2. Observer les créneaux disponibles

**Résultat attendu :** Liste des créneaux libres (heure de début / fin)
**Résultat en erreur :** Comptable en congé → message "Le comptable est en congé"

---

### SC-APT-03 : Filtrer mes rendez-vous

**Étapes :**

1. Aller dans "Mes rendez-vous"
2. Utiliser le filtre "Aujourd'hui" → voir uniquement les RDV du jour
3. Utiliser "À venir" → voir les prochains RDV
4. Utiliser "Passés" → voir l'historique

**Résultat attendu :** Liste filtrée correctement selon la date et l'heure actuelle

---

### SC-APT-04 : Annuler un rendez-vous

**Étapes :**

1. Ouvrir un rendez-vous confirmé ou en attente
2. Cliquer sur "Annuler"
3. Confirmer

**Résultat attendu :** Statut passe à "Annulé", notification envoyée à l'autre partie

---

### SC-APT-05 : Reporter un rendez-vous

**Étapes :**

1. Ouvrir un rendez-vous
2. Cliquer sur "Reporter"
3. Saisir une nouvelle date et heure
4. Ajouter une raison (optionnel)
5. Valider

**Résultat attendu :** RDV mis à jour, statut repasse à "En attente", historique enregistré, tag "Reporté" visible

---

## MODULE 5 — RENDEZ-VOUS (COMPTABLE)

### SC-APT-06 : Confirmer un rendez-vous

**Rôle :** ACCOUNTANT
**Étapes :**

1. Aller dans "Rendez-vous" → onglet "En attente"
2. Ouvrir un rendez-vous
3. Cliquer sur "Confirmer"

**Résultat attendu :** Statut passe à "Confirmé", notification envoyée au client

---

### SC-APT-07 : Refuser un rendez-vous

**Étapes :**

1. Ouvrir un rendez-vous en attente
2. Cliquer sur "Refuser"
3. Saisir une raison
4. Valider

**Résultat attendu :** Statut passe à "Refusé", notification envoyée au client

---

### SC-APT-08 : Gérer ses disponibilités

**Étapes :**

1. Aller dans "Mes disponibilités"
2. Cliquer sur "Ajouter une disponibilité"
3. Choisir : récurrent (ex: lundi 09h-17h) ou ponctuel (date spécifique)
4. Définir la durée des créneaux (30 ou 60 min)
5. Valider

**Résultat attendu :** Disponibilité créée, visible dans le calendrier

---

### SC-APT-09 : Déclarer un congé

**Étapes :**

1. Aller dans "Mes congés"
2. Cliquer sur "Déclarer un congé"
3. Saisir date de début, date de fin, raison
4. Valider

**Résultat attendu :** Congé enregistré, les créneaux de cette période ne s'affichent plus pour les clients

---

### SC-APT-10 : Voir les RDV du mois

**Étapes :**

1. Aller dans "Tableau de bord" ou "Calendrier"
2. Observer les rendez-vous confirmés du mois en cours

**Résultat attendu :** Liste avec titre, date, heure, client

---

## MODULE 6 — DOCUMENTS (CLIENT)

### SC-DOC-01 : Uploader un document

**Rôle :** CLIENT
**Étapes :**

1. Aller dans "Mes documents"
2. Cliquer sur "Uploader"
3. Sélectionner un fichier (PDF, Excel, image...)
4. Choisir une catégorie (facture, contrat, rapport...)
5. Valider

**Résultat attendu :** Document visible dans la liste avec statut "En attente"

---

### SC-DOC-02 : Créer un dossier

**Étapes :**

1. Cliquer sur "Nouveau dossier"
2. Saisir un nom
3. Valider

**Résultat attendu :** Dossier créé, visible dans l'arborescence

---

### SC-DOC-03 : Rechercher un document

**Étapes :**

1. Utiliser la barre de recherche
2. Taper un nom de fichier ou de dossier

**Résultat attendu :** Résultats affichés (recherche récursive dans tous les sous-dossiers)

---

### SC-DOC-04 : Télécharger un document

**Étapes :**

1. Cliquer sur un document
2. Cliquer sur "Télécharger"

**Résultat attendu :** Fichier téléchargé

---

### SC-DOC-05 : Archiver un document

**Étapes :**

1. Faire un clic droit sur un document ou utiliser le menu
2. Cliquer sur "Archiver"

**Résultat attendu :** Document déplacé dans les archives, plus visible dans la liste principale

---

### SC-DOC-06 : Voir l'historique des versions

**Étapes :**

1. Ouvrir un document
2. Cliquer sur "Historique des versions"

**Résultat attendu :** Liste des versions avec numéro, date, auteur, commentaire

---

### SC-DOC-07 : Uploader une nouvelle version

**Étapes :**

1. Ouvrir un document
2. Cliquer sur "Nouvelle version"
3. Sélectionner le fichier mis à jour
4. Ajouter un commentaire (optionnel)
5. Valider

**Résultat attendu :** Nouvelle version créée, numéro de version incrémenté

---

### SC-DOC-08 : Restaurer une ancienne version

**Étapes :**

1. Ouvrir l'historique des versions
2. Cliquer sur "Restaurer" sur une version précédente
3. Confirmer

**Résultat attendu :** Version restaurée comme version courante

---

## MODULE 7 — FACTURES (COMPTABLE)

### SC-INV-01 : Extraire les données d'une facture

**Rôle :** ACCOUNTANT
**Étapes :**

1. Ouvrir un document de type "facture"
2. Cliquer sur "Extraire les données"

**Résultat attendu :** Données extraites affichées (numéro, date, lignes, montants HT/TVA/TTC)

---

### SC-INV-02 : Vérifier et sauvegarder une facture

**Étapes :**

1. Après extraction, vérifier les données dans le formulaire
2. Corriger si nécessaire
3. Cliquer sur "Enregistrer"

**Résultat attendu :** Données sauvegardées, statut passe à "Enregistré"
**Résultat en erreur :** Si les totaux envoyés ne correspondent pas au calcul → avertissement affiché

---

### SC-INV-03 : Synchroniser une facture

**Étapes :**

1. Ouvrir une facture avec statut "Enregistré"
2. Cliquer sur "Synchroniser"

**Résultat attendu :** Statut passe à "Synchronisé"

---

### SC-INV-04 : Filtrer les factures par statut

**Étapes :**

1. Aller dans la liste des factures
2. Filtrer par "En attente", "Traité", "Enregistré", "Synchronisé"

**Résultat attendu :** Liste filtrée correctement

---

## MODULE 8 — TÂCHES (COMPTABLE / COLLABORATEUR)

### SC-TASK-01 : Créer une tâche (COMPTABLE)

**Rôle :** ACCOUNTANT
**Étapes :**

1. Aller dans "Tâches"
2. Cliquer sur "Nouvelle tâche"
3. Remplir : titre, description, priorité, date limite, assigner à un collaborateur
4. Ajouter des pièces jointes (optionnel)
5. Valider

**Résultat attendu :** Tâche créée, notification envoyée au collaborateur

---

### SC-TASK-02 : Démarrer une tâche (COLLABORATEUR)

**Rôle :** COLLABORATOR
**Étapes :**

1. Aller dans "Mes tâches"
2. Ouvrir une tâche avec statut "À faire"
3. Cliquer sur "Démarrer"

**Résultat attendu :** Statut passe à "En cours"

---

### SC-TASK-03 : Soumettre pour révision

**Étapes :**

1. Ouvrir une tâche "En cours"
2. Cliquer sur "Soumettre pour révision"

**Résultat attendu :** Tâche soumise, notification au comptable

---

### SC-TASK-04 : Valider ou rejeter une tâche (COMPTABLE)

**Étapes :**

1. Ouvrir une tâche soumise pour révision
2. Cliquer sur "Valider" → tâche complétée
   OU cliquer sur "Rejeter" + commentaire → tâche retourne en "À faire"

**Résultat attendu :** Statut mis à jour, notification au collaborateur

---

### SC-TASK-05 : Réorganiser les tâches (drag & drop)

**Étapes :**

1. Dans la vue Kanban
2. Glisser une tâche d'une colonne à une autre

**Résultat attendu :** Ordre sauvegardé

---

## MODULE 9 — DEMANDES (CLIENT / COMPTABLE)

### SC-REQ-01 : Créer une demande (CLIENT)

**Rôle :** CLIENT
**Étapes :**

1. Aller dans "Mes demandes"
2. Cliquer sur "Nouvelle demande"
3. Remplir : sujet, description, urgence
4. Ajouter des pièces jointes (optionnel)
5. Valider

**Résultat attendu :** Demande créée, notification au comptable

---

### SC-REQ-02 : Répondre à une demande (COMPTABLE)

**Rôle :** ACCOUNTANT
**Étapes :**

1. Aller dans "Demandes" → onglet "En attente"
2. Ouvrir une demande
3. Saisir une réponse
4. Cliquer sur "Résoudre"

**Résultat attendu :** Demande résolue, notification au client

---

### SC-REQ-03 : Convertir une demande en tâche (COMPTABLE)

**Étapes :**

1. Ouvrir une demande
2. Cliquer sur "Convertir en tâche"
3. Assigner à un collaborateur, définir une date limite
4. Valider

**Résultat attendu :** Tâche créée depuis la demande

---

## MODULE 10 — RELATIONS CLIENT-COMPTABLE

### SC-REL-01 : Envoyer une invitation

**Étapes :**

1. Aller dans "Relations" ou "Trouver un comptable"
2. Sélectionner un comptable
3. Cliquer sur "Inviter"
4. Ajouter un message (optionnel)
5. Valider

**Résultat attendu :** Invitation envoyée, visible dans "Invitations en attente"
**Résultat en erreur :** Relation déjà existante → message d'erreur

---

### SC-REL-02 : Accepter une invitation

**Étapes :**

1. Aller dans "Invitations reçues"
2. Cliquer sur "Accepter"

**Résultat attendu :** Relation activée, les deux parties peuvent collaborer

---

### SC-REL-03 : Résilier une relation

**Étapes :**

1. Aller dans "Mes relations actives"
2. Cliquer sur "Résilier"
3. Saisir une raison
4. Confirmer

**Résultat attendu :** Relation terminée, historique conservé

---

## MODULE 11 — PROFIL UTILISATEUR

### SC-PROF-01 : Modifier son profil

**Étapes :**

1. Aller dans "Mon profil"
2. Modifier : prénom, nom, téléphone, photo
3. Sauvegarder

**Résultat attendu :** Profil mis à jour, photo visible dans le header

---

### SC-PROF-02 : Modifier les informations de l'entreprise

**Étapes :**

1. Aller dans "Mon profil" → onglet "Entreprise"
2. Modifier : adresse, ville, SIRET, logo
3. Sauvegarder

**Résultat attendu :** Informations entreprise mises à jour

---

## MODULE 12 — MESSAGERIE (CHAT)

### SC-CHAT-01 : Créer une conversation

**Étapes :**

1. Aller dans "Messagerie"
2. Cliquer sur "Nouvelle conversation"
3. Sélectionner un ou plusieurs participants
4. Valider

**Résultat attendu :** Salle de chat créée

---

### SC-CHAT-02 : Envoyer un message

**Étapes :**

1. Ouvrir une conversation
2. Taper un message
3. Appuyer sur Entrée ou cliquer sur "Envoyer"

**Résultat attendu :** Message affiché en temps réel pour tous les participants

---

### SC-CHAT-03 : Envoyer un fichier

**Étapes :**

1. Dans une conversation, cliquer sur l'icône pièce jointe
2. Sélectionner un fichier
3. Envoyer

**Résultat attendu :** Fichier visible dans la conversation, téléchargeable

---

## MODULE 13 — NOTIFICATIONS

### SC-NOTIF-01 : Recevoir une notification

**Étapes :**

1. Un autre utilisateur effectue une action (crée un RDV, envoie une demande...)
2. Observer la cloche de notification

**Résultat attendu :** Badge rouge avec le nombre de notifications non lues

---

### SC-NOTIF-02 : Marquer comme lu

**Étapes :**

1. Cliquer sur la cloche
2. Cliquer sur une notification

**Résultat attendu :** Notification marquée comme lue, badge décrémenté

---

### SC-NOTIF-03 : Tout marquer comme lu

**Étapes :**

1. Cliquer sur la cloche
2. Cliquer sur "Tout marquer comme lu"

**Résultat attendu :** Badge disparaît, toutes les notifications passent en "lu"

---

## MODULE 14 — RÉSEAU / AVIS

### SC-REVIEW-01 : Laisser un avis sur un comptable

**Rôle :** CLIENT
**Étapes :**

1. Aller sur le profil public d'un comptable
2. Cliquer sur "Laisser un avis"
3. Donner une note (1-5 étoiles) et un commentaire
4. Valider

**Résultat attendu :** Avis publié, visible sur le profil du comptable
**Résultat en erreur :** Pas de relation active avec ce comptable → message d'erreur

---

### SC-REVIEW-02 : Répondre à un avis (COMPTABLE)

**Étapes :**

1. Aller dans "Mes avis"
2. Cliquer sur "Répondre" sous un avis
3. Saisir la réponse
4. Valider

**Résultat attendu :** Réponse visible sous l'avis

---

## MODULE 15 — STOCKAGE (ADMINISTRATOR)

### SC-STORAGE-01 : Voir l'utilisation du stockage

**Rôle :** ADMINISTRATOR
**Étapes :**

1. Aller dans "Stockage"
2. Observer le tableau de bord

**Résultat attendu :** Liste des compagnies avec leur utilisation (Mo/Go, pourcentage)

---

### SC-STORAGE-02 : Voir les alertes

**Étapes :**

1. Aller dans "Alertes stockage"

**Résultat attendu :** Liste des compagnies ayant dépassé 80% de leur quota

---

## Cas de tests transversaux

### SC-PERM-01 : Accès refusé selon le rôle

**Étapes :**

1. Se connecter en tant que CLIENT
2. Essayer d'accéder à une page réservée au COMPTABLE (ex: créer une tâche)

**Résultat attendu :** Redirection ou message "Accès refusé"

---

### SC-PERM-02 : Session expirée

**Étapes :**

1. Laisser la session inactive pendant longtemps
2. Essayer d'effectuer une action

**Résultat attendu :** Redirection vers la page de connexion avec message "Session expirée"

---

### SC-VALID-01 : Formulaire avec champs obligatoires vides

**Étapes :**

1. Ouvrir n'importe quel formulaire de création
2. Laisser les champs obligatoires vides
3. Cliquer sur "Valider"

**Résultat attendu :** Messages d'erreur de validation sous chaque champ manquant, formulaire non soumis

---

### SC-VALID-02 : Format email invalide

**Étapes :**

1. Dans un formulaire avec champ email
2. Saisir "test@" ou "test.com"
3. Valider

**Résultat attendu :** Message "Format d'email invalide"
