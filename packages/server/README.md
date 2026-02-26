# FINORA Backend API

API REST pour la plateforme FINORA - Gestion comptable et collaboration.

## 🚀 Installation

### Prérequis

- Node.js 18+ et pnpm
- PostgreSQL 14+
- MinIO (pour le stockage de documents)

### Configuration

1. **Cloner le projet et installer les dépendances**

```bash
pnpm install
```

2. **Configurer les variables d'environnement**

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

3. **Configurer PostgreSQL**

```bash
# Créer la base de données
createdb finora

# Ou via psql
psql -U postgres
CREATE DATABASE finora;
```

4. **Générer le client Prisma et créer les tables**

```bash
npx prisma generate
npx prisma db push
```

5. **Lancer les seeds (données de test)**

```bash
pnpm run seed
```

## 🏃 Démarrage

### Mode développement

```bash
pnpm run start:dev
```

### Mode production

```bash
pnpm run build
pnpm run start:prod
```

## 📚 Documentation API

Une fois le serveur démarré, accédez à la documentation Swagger :

```
http://localhost:3000/docs
```

## 🔑 Comptes de test

Après avoir lancé les seeds, vous aurez accès à ces comptes :

| Rôle          | Email                    | Mot de passe |
| ------------- | ------------------------ | ------------ |
| Admin         | admin@finora.com         | password123  |
| Comptable     | comptable@finora.com     | password123  |
| Collaborateur | collaborateur@finora.com | password123  |
| Client        | client@finora.com        | password123  |

## 🗂️ Structure du projet

```
src/
├── common/              # Services partagés (Hash, JWT, MinIO, etc.)
├── modules/
│   ├── auth/           # Authentification & autorisation
│   ├── user/           # Gestion des utilisateurs
│   ├── role/           # Gestion des rôles et permissions
│   ├── admin/          # Module administrateur
│   ├── accountant/     # Module comptable
│   ├── document/       # Gestion des documents (MinIO)
│   └── mail/           # Envoi d'emails
└── prisma/
    ├── models/         # Modèles Prisma
    └── seeds/          # Données de test
```

## 🔐 Système de permissions

Le système utilise des **Actions** liées aux **Pages** et **Features** :

- **Feature** : Module fonctionnel (ex: Dashboard, Documents)
- **Page** : Page spécifique dans un module
- **Action** : Opération CRUD (VIEW, CREATE, UPDATE, DELETE)

Les permissions sont assignées aux rôles via les actions.

## 📦 Modules principaux

### Auth Module

- Login / Logout
- Refresh token
- Reset password
- Vérification email

### Document Module

- Upload de fichiers vers MinIO
- Structure hiérarchique (dossiers/sous-dossiers)
- Téléchargement de fichiers
- Gestion des permissions par société

### Admin Module

- Création de comptes comptables
- Validation des inscriptions
- Gestion des utilisateurs

### Accountant Module

- Création de collaborateurs
- Création de clients
- Gestion de cabinet

## 🛠️ Commandes utiles

```bash
# Générer le client Prisma
npx prisma generate

# Créer une migration
npx prisma migrate dev --name nom_migration

# Synchroniser le schéma sans migration
npx prisma db push

# Réinitialiser la base de données
npx prisma migrate reset

# Lancer les seeds
pnpm run seed

# Linter
pnpm run lint

# Tests
pnpm run test
```

## 🔧 Configuration MinIO

MinIO est utilisé pour le stockage des documents. Configuration par défaut :

```env
MINIO_ENDPOINT=192.168.1.185
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

Le bucket `finora-documents` est créé automatiquement au démarrage.

## 📧 Configuration Email

Pour l'envoi d'emails via Gmail :

1. Activer l'authentification à 2 facteurs sur votre compte Gmail
2. Générer un "App Password" : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe (16 caractères) dans `EMAIL_PASS`

## 🐛 Dépannage

### Erreur de connexion PostgreSQL

- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans `.env`
- Le mot de passe doit être une chaîne (pas un nombre)

### Erreur MinIO

- Vérifier que MinIO est accessible sur le réseau
- Tester la connexion : `curl http://192.168.1.185:9000`

### Erreur d'envoi d'email

- Vérifier que vous utilisez un App Password Gmail (pas votre mot de passe normal)
- Le mot de passe doit être 16 caractères sans espaces

## 📝 Variables d'environnement

Voir `.env.example` pour la liste complète des variables.

## 🤝 Contribution

1. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
2. Commiter : `git commit -m "feat: ajout de ma fonctionnalité"`
3. Push : `git push origin feature/ma-fonctionnalite`
4. Créer une Pull Request

## 📄 Licence

Propriétaire - FINORA © 2024
