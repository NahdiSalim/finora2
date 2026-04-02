/**
 * Messages centralisés — FR
 * Structure : MODULE.ACTION.success | MODULE.ACTION.error_CODE
 */

export const MSG = {
  // ─── RENDEZ-VOUS ────────────────────────────────────────────────────────────
  appointment: {
    created: 'Rendez-vous créé avec succès.',
    updated: 'Rendez-vous mis à jour avec succès.',
    deleted: 'Rendez-vous supprimé avec succès.',
    cancelled: 'Rendez-vous annulé avec succès.',
    confirmed: 'Rendez-vous confirmé avec succès.',
    rejected: 'Rendez-vous refusé.',
    rescheduled: 'Rendez-vous reprogrammé avec succès.',
    reported: 'Rendez-vous reporté avec succès.',

    not_found: 'Rendez-vous introuvable.',
    access_denied: "Vous n'avez pas accès à ce rendez-vous.",
    invalid_status: 'Ce rendez-vous ne peut pas être modifié dans son état actuel.',
    already_pending: 'Ce rendez-vous est déjà en attente de confirmation.',

    slot_not_found: 'Ce créneau horaire est introuvable.',
    slot_unavailable: 'Ce créneau est déjà réservé.',
    accountant_unavailable: "Le comptable n'est pas disponible à cette date.",
    hour_out_of_range: (hour: string, start: string, end: string) =>
      `L'heure ${hour} est en dehors des disponibilités (${start} - ${end}).`,
  },

  // ─── DISPONIBILITÉS ─────────────────────────────────────────────────────────
  availability: {
    created: 'Disponibilité ajoutée avec succès.',
    updated: 'Disponibilité mise à jour avec succès.',
    deleted: 'Disponibilité supprimée avec succès.',

    not_found: 'Disponibilité introuvable.',
    access_denied: "Vous n'avez pas accès à cette disponibilité.",
    missing_day: 'Le jour de la semaine est requis pour une disponibilité récurrente.',
    missing_date: 'La date est requise pour une disponibilité ponctuelle.',
    invalid_time: "L'heure de début doit être avant l'heure de fin.",
  },

  // ─── CONGÉS ─────────────────────────────────────────────────────────────────
  leave: {
    created: 'Congé déclaré avec succès.',
    deleted: 'Congé supprimé avec succès.',

    not_found: 'Congé introuvable.',
    access_denied: "Vous n'avez pas accès à ce congé.",
    invalid_range: 'La date de début doit être avant la date de fin.',
    on_leave: (reason?: string) =>
      reason ? `Le comptable est en congé : ${reason}` : 'Le comptable est en congé à cette date.',
  },

  // ─── DOCUMENTS ──────────────────────────────────────────────────────────────
  document: {
    created: 'Document créé avec succès.',
    updated: 'Document mis à jour avec succès.',
    deleted: 'Document supprimé avec succès.',
    moved: 'Document déplacé avec succès.',
    imported: 'Document importé avec succès.',
    restored: 'Version restaurée avec succès.',
    archived: 'Document archivé avec succès.',
    unarchived: 'Document désarchivé avec succès.',
    folder_archived: 'Dossier et son contenu archivés avec succès.',
    folder_unarchived: 'Dossier et son contenu désarchivés avec succès.',
    uploaded: 'Fichier téléchargé avec succès.',
    folder_created: 'Dossier créé avec succès.',

    not_found: 'Document introuvable.',
    access_denied: "Vous n'avez pas accès à ce document.",
    folder_not_found: 'Dossier introuvable.',
    version_not_found: 'Version introuvable.',
    permission_denied: "Vous n'avez pas la permission de modifier ce document.",
    permission_denied_delete: "Vous n'avez pas la permission de supprimer ce document.",
    folder_not_empty: 'Impossible de supprimer un dossier non vide.',
    invalid_move: 'Impossible de déplacer un dossier dans lui-même ou ses sous-dossiers.',
    no_relationship: 'Aucune relation active avec ce client.',
    service_unavailable:
      "Le service de stockage de fichiers n'est pas disponible. Veuillez contacter l'administrateur.",
  },

  // ─── UTILISATEURS ───────────────────────────────────────────────────────────
  user: {
    created: 'Compte créé avec succès.',
    updated: 'Profil mis à jour avec succès.',
    deleted: 'Compte supprimé avec succès.',
    activated: 'Compte activé avec succès.',
    suspended: 'Compte suspendu.',
    password_reset: 'Mot de passe réinitialisé avec succès.',
    password_reset_sent: 'Un lien de réinitialisation a été envoyé à votre adresse e-mail.',
    registered: 'Inscription réussie. Votre compte est en attente de validation.',
    collaborator_created: 'Collaborateur créé avec succès.',
    client_created: 'Client créé avec succès.',
    profile_updated: 'Profil mis à jour avec succès.',

    not_found: 'Utilisateur introuvable.',
    already_exists: 'Un compte avec cet e-mail existe déjà.',
    invalid_credentials: 'E-mail ou mot de passe incorrect.',
    account_inactive: 'Votre compte est inactif. Contactez votre administrateur.',
    account_suspended: 'Votre compte a été suspendu. Contactez votre administrateur.',
    no_company: "Votre compte n'est associé à aucune entreprise.",
    forbidden: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
    role_not_found: 'Rôle introuvable.',
    siret_exists: 'Ce numéro SIRET est déjà utilisé.',
    upload_failed: 'Échec du téléchargement du fichier.',
    password_required: 'Le mot de passe est requis.',
    password_too_short: 'Le mot de passe doit contenir au moins 8 caractères.',
    passwords_mismatch: 'Les mots de passe ne correspondent pas.',
    reset_link_invalid: 'Le lien de réinitialisation est invalide ou a expiré.',
    reset_link_sent: 'Si cet e-mail existe, un lien de réinitialisation a été envoyé.',
    reset_email_sent: 'Un e-mail de réinitialisation a été envoyé à votre adresse.',
    reset_email_failed: "Échec de l'envoi de l'e-mail de réinitialisation. Veuillez réessayer.",
  },

  // ─── AUTHENTIFICATION ───────────────────────────────────────────────────────
  auth: {
    login_success: 'Connexion réussie.',
    logout_success: 'Déconnexion réussie.',
    token_invalid: 'Session expirée. Veuillez vous reconnecter.',
    token_missing: 'Authentification requise.',
    forbidden: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
  },

  // ─── COMPTABLE ──────────────────────────────────────────────────────────────
  accountant: {
    not_found: 'Comptable introuvable.',
    profile_not_found: 'Profil comptable introuvable.',
    no_company: "Le comptable n'est associé à aucune entreprise.",
    forbidden: 'Seuls les comptables peuvent effectuer cette action.',
    role_not_found: 'Rôle introuvable.',
  },

  // ─── CLIENTS / RELATIONS ────────────────────────────────────────────────────
  relation: {
    created: 'Relation établie avec succès.',
    terminated: 'Relation terminée.',
    invitation_sent: 'Invitation envoyée avec succès.',
    invitation_accepted: 'Invitation acceptée.',
    invitation_rejected: 'Invitation refusée.',

    not_found: 'Relation introuvable.',
    already_exists: 'Une relation existe déjà avec ce client.',
  },

  // ─── TÂCHES ─────────────────────────────────────────────────────────────────
  task: {
    created: 'Tâche créée avec succès.',
    updated: 'Tâche mise à jour avec succès.',
    deleted: 'Tâche supprimée avec succès.',
    reordered: 'Tâches réorganisées avec succès.',
    comment_added: 'Commentaire ajouté avec succès.',
    approved: 'Tâche approuvée avec succès.',
    rejected: 'Tâche refusée et réassignée.',

    not_found: 'Tâche introuvable.',
    access_denied: "Vous n'avez pas accès à cette tâche.",
    no_company: 'Vous devez appartenir à une entreprise pour créer des tâches.',
    no_assignee: 'Au moins un assigné est requis.',
    invalid_client: 'Le client doit appartenir à la même entreprise.',
    forbidden_complete:
      'Seuls les comptables peuvent marquer une tâche comme terminée. Utilisez "en révision".',
    forbidden_archive: 'Seuls les comptables peuvent archiver une tâche.',
    invalid_status: 'La tâche doit être terminée avant validation.',
    creator_only_validate: 'Seul le créateur de la tâche peut la valider.',
    creator_only_delete: 'Seul le créateur de la tâche peut la supprimer.',
  },

  // ─── DEMANDES ───────────────────────────────────────────────────────────────
  request: {
    created: 'Demande envoyée avec succès.',
    updated: 'Demande mise à jour avec succès.',
    deleted: 'Demande supprimée avec succès.',
    approved: 'Demande approuvée.',
    rejected: 'Demande refusée.',
    responded: 'Réponse envoyée avec succès.',
    converted: 'Demande convertie en tâche avec succès.',

    not_found: 'Demande introuvable.',
    access_denied: "Vous n'avez pas accès à cette demande.",
    no_company: 'Le client doit appartenir à une entreprise.',
    already_converted: 'Cette demande a déjà été convertie en tâche.',
    creator_only_delete: 'Seul le créateur de la demande peut la supprimer.',
    subject_required: "L'objet de la demande est requis.",
  },

  // ─── GÉNÉRIQUE ──────────────────────────────────────────────────────────────
  generic: {
    success: 'Opération effectuée avec succès.',
    not_found: 'Ressource introuvable.',
    bad_request: 'Données invalides. Veuillez vérifier les informations saisies.',
    server_error: 'Une erreur est survenue. Veuillez réessayer plus tard.',
    access_denied: 'Accès refusé.',
    validation_error: 'Certains champs sont invalides ou manquants.',
  },

  // ─── FACTURES ───────────────────────────────────────────────────────────────
  invoice: {
    already_extracted: 'Facture déjà extraite.',
    extracted: 'Facture extraite avec succès. Veuillez vérifier et enregistrer les données.',
    saved: 'Métadonnées de la facture enregistrées avec succès.',
    synchronized: 'Document synchronisé avec succès.',
    extraction_failed: "Échec de l'extraction des métadonnées de la facture.",
    sync_failed: 'Échec de la synchronisation du document.',
    save_failed: "Échec de l'enregistrement des métadonnées de la facture.",
    invalid_data: 'Les données extraites doivent être un objet JSON valide.',
    invalid_status: (status: string) =>
      `Le document doit être au statut "traite" ou "enregistre" pour enregistrer les métadonnées. Statut actuel : ${status}`,
    invalid_sync_status: (status: string) =>
      `Le document doit être au statut "enregistre" pour être synchronisé. Statut actuel : ${status}`,
  },
};
