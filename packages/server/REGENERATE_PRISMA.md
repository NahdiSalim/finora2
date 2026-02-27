# Comment régénérer Prisma correctement

## Problème

TypeScript ne reconnaît pas les nouveaux champs `actionUrl`, `readAt`, `priority` dans le modèle Notification.

## Solution

### Étape 1: Arrêter le serveur

Appuie sur `Ctrl+C` dans le terminal où tourne le serveur.

### Étape 2: Nettoyer les caches

```bash
cd packages/server
rm -rf dist
rm -rf node_modules/.cache
rm -rf tsconfig.tsbuildinfo
```

### Étape 3: Régénérer Prisma

```bash
node scripts/merge-prisma-models.js
npx prisma generate
npx prisma db push
```

### Étape 4: Redémarrer l'IDE

Ferme et rouvre VSCode/ton IDE pour qu'il recharge les types TypeScript.

### Étape 5: Rebuild et redémarrer

```bash
npm run build
npm run start:dev
```

## Vérification

Si ça ne marche toujours pas, vérifie que le fichier généré contient les bons champs:

```bash
# Cherche dans le client généré
grep -r "actionUrl" node_modules/.prisma/client/
```

## Alternative: Utiliser @ts-expect-error temporairement

Si tu veux continuer à développer en attendant, les `@ts-expect-error` sont déjà ajoutés dans le code.
