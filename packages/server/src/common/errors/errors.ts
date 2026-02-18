export const errors = {
  NOT_FOUND: {
    message: 'Impossible de trouver le document',
    code: 404,
    errorCode: 'NOT_FOUND',
  },

  BAD_REQUEST: {
    message: 'Requête invalide',
    code: 400,
    errorCode: 'BAD_REQUEST',
  },
  INVALID_PASSWORD: {
    message: 'Password must be at least 8 characters',
    code: 400,
    errorCode: 'INVALID_PASSWORD',
  },
  ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND: {
    message:
      'Le programme doit être situé dans un sous-dossier du dossier "server"',
    code: 500,
    errorCode: 'ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND',
  },
  BAD_CREDENTIEL: {
    message: 'Verifier les donner saisie ',
    code: 400,
    errorCode: 'BAD_CREDENTIEL',
  },

  BAD_EMAIL_CREDENTIEL: {
    message: "Veuillez Vérifier l'email saisie",
    code: 400,
    errorCode: 'BAD_EMAIL_CREDENTIEL',
  },

  INVALID_EMAIL: {
    message: 'Email invalide',
    code: 400,
    errorCode: 'INVALID_EMAIL',
  },

  ADMIN_ROLE_UPDATE_FORBIDDEN: {
    message: 'Cannot update the admin role',
    code: 403,
    errorCode: 'ADMIN_ROLE_UPDATE_FORBIDDEN',
  },

  CONFLICT: {
    message: 'Conflit de ressource',
    code: 409,
    errorCode: 'CONFLICT',
  },

  USER_CONFLICT: {
    message: 'Conflit avec un ou plusieurs utilisateurs',
    code: 409,
    errorCode: 'USER_CONFLICT',
  },
  ADMIN_UPDATE_FORBIDDEN: {
    message: 'Cannot update the admin ',
    code: 403,
    errorCode: 'ADMIN_UPDATE_FORBIDDEN',
  },

  FORBIDDEN_DELETE_ADMIN: {
    message: 'Admin role cannot be deleted',
    code: 403,
    errorCode: 'FORBIDDEN_DELETE_ADMIN',
  },

  FORBIDDEN_DELETE_ADMIN_USER: {
    message: 'Admin cannot be deleted',
    code: 403,
    errorCode: 'FORBIDDEN_DELETE_ADMIN_USER',
  },
  ERR_USER_EXISTS: {
    message: 'User already exists',
    code: 400,
    errorCode: 'ERR_USER_EXISTS',
  },

  ERR_ROLE_EXISTS: {
    message: 'role already exists',
    code: 400,
    errorCode: 'ERR_ROLE_EXISTS',
  },

  ERR_EMAIL_EXISTS: {
    message: 'Email already exists',
    code: 400,
    errorCode: 'ERR_EMAIL_EXISTS',
  },

  ERR_ANOTHORIZED: {
    message: 'Unauthorized entry',
    code: 401,
    errorCode: 'ERR_ANOTHORIZED',
  },

  VERIFY_PROFILE_OWNERSHIP: {
    message: 'Profile ownership violation',
    code: 403,
    errorCode: 'VERIFY_PROFILE_OWNERSHIP',
  },

  SERVER_ERROR: {
    message: 'Internal server error',
    code: 500,
    errorCode: 'SERVER_ERROR',
  },

  NEED_AUTH: {
    message: 'Authentication token missing or invalid',
    code: 401,
    errorCode: 'NEED_AUTH',
  },

  BLOCKED_USER: {
    message: 'User blocked or inactive. Contact support.',
    code: 403,
    errorCode: 'BLOCKED_USER',
  },

  DELETED_USER: {
    message: 'User has been deleted',
    code: 404,
    errorCode: 'DELETED_USER',
  },

  ROLE_NOT_FOUND: {
    message: 'Role not found',
    code: 404,
    errorCode: 'ROLE_NOT_FOUND',
  },

  EXTRACTION_FAIL: {
    message: "L'API Python n'a pas pu extraire le programme.",
    code: 500,
    errorCode: 'EXTRACTION_FAIL',
  },

  EXTRACTION_TYPE_ERROR: {
    message: "Le type doit être 'DE_PROG', 'TN_PROG' ou 'PROFILE'.",
    code: 400,
    errorCode: 'EXTRACTION_TYPE_ERROR',
  },

  EXTRACTION_ALREADY_DONE: {
    message: 'Ce fichier a déjà été utilisé dans une autre extraction.',
    code: 400,
    errorCode: 'EXTRACTION_ALREADY_DONE',
  },

  INVALID_TOKEN: {
    message: 'token invalide ',
    code: 401,
    errorCode: 'INVALID_TOKEN',
  },
  ERR_PROGRAM_HAS_COMPARISON: {
    message: 'Le programme est lié à une ou plusieurs comparaisons',
    code: 400,
    errorCode: 'ERR_PROGRAM_HAS_COMPARISON',
  },

  ERR_PROGRAM_HAS_PROFILE_COMPARISON: {
    message: 'Le programme est utilisé dans des comparaisons de profils',
    code: 400,
    errorCode: 'ERR_PROGRAM_HAS_PROFILE_COMPARISON',
  },
  ERR_PROFILE_HAS_COMPARISON: {
    message: 'Profile has linked profile comparisons',
    code: 400,
    errorCode: 'ERR_PROFILE_HAS_COMPARISON',
  },

  CHAT_SESSION_START_FAILED: {
    message: 'Impossible de démarrer la session de chat',
    code: 500,
    errorCode: 'CHAT_SESSION_START_FAILED',
  },

  CHAT_MESSAGES_FETCH_FAILED: {
    message: 'Impossible de récupérer les messages',
    code: 500,
    errorCode: 'CHAT_MESSAGES_FETCH_FAILED',
  },

  CHAT_SEND_MESSAGE_FAILED: {
    message: "Impossible d'envoyer le message",
    code: 500,
    errorCode: 'CHAT_SEND_MESSAGE_FAILED',
  },

  PERMISSION_DENIED: {
    message: "Vous n'avez pas la permission d'accéder à cette ressource",
    code: 403,
    errorCode: 'PERMISSION_DENIED',
  },

  USER_ROLE_NOT_FOUND: {
    message: 'Rôle utilisateur non trouvé',
    code: 403,
    errorCode: 'USER_ROLE_NOT_FOUND',
  },
  /* ---------------- PROFILE COMPARISON ---------------- */

  PRE_COMPARAISON_NOT_CONFIGURED: {
    message: 'Le service de pré-comparaison n’est pas configuré',
    code: 500,
    errorCode: 'PRE_COMPARAISON_NOT_CONFIGURED',
  },

  PRE_COMPARAISON_FAILED: {
    message: 'La pré-comparaison a échoué',
    code: 500,
    errorCode: 'PRE_COMPARAISON_FAILED',
  },

  COMPARISON_SERVICE_NOT_CONFIGURED: {
    message: 'Le service de comparaison n’est pas configuré',
    code: 500,
    errorCode: 'COMPARISON_SERVICE_NOT_CONFIGURED',
  },

  PROFILE_COMPARISON_FAILED: {
    message: 'La comparaison des profils a échoué',
    code: 500,
    errorCode: 'PROFILE_COMPARISON_FAILED',
  },
} as const;
