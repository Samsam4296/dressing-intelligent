# CI Secrets Checklist

Liste des secrets requis pour le pipeline CI de **Dressing Intelligent**.

## Secrets Requis

### Sentry (Optionnel - Monitoring)

| Secret | Description | Requis pour |
|--------|-------------|-------------|
| `SENTRY_AUTH_TOKEN` | Token d'authentification Sentry | Upload source maps |
| `SENTRY_ORG` | Nom de l'organisation Sentry | Upload source maps |
| `SENTRY_PROJECT` | Nom du projet Sentry | Upload source maps |

**Comment obtenir:**
1. Allez sur [sentry.io](https://sentry.io) → Settings → Auth Tokens
2. Créez un token avec les scopes: `project:releases`, `org:read`
3. Copiez le nom de l'org et du projet depuis l'URL

## Configuration GitHub

### Ajouter un secret

1. Allez sur votre repo GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Cliquez **New repository secret**
4. Entrez le nom et la valeur
5. Cliquez **Add secret**

### Vérifier les secrets

```bash
# Les secrets sont masqués dans les logs
# Pour vérifier qu'un secret existe:
gh secret list
```

## Sécurité

### Bonnes pratiques

- ✅ Ne jamais commiter de secrets dans le code
- ✅ Utiliser des tokens avec permissions minimales
- ✅ Rotation régulière des tokens (tous les 90 jours)
- ✅ Supprimer les secrets inutilisés

### Ce qui ne doit JAMAIS être dans le repo

- `.env` avec des vraies valeurs
- Tokens API
- Clés privées
- Mots de passe
- Certificats de signature

### Vérification

Le `.gitignore` doit contenir:

```
.env
.env.local
.env.*.local
*.key
*.pem
*.p12
```

## Secrets pour le développement local

Créez un fichier `.env.local` (non commité) basé sur `.env.example`:

```bash
cp .env.example .env.local
# Éditez .env.local avec vos vraies valeurs
```

## Statut des secrets

| Secret | Configuré | Testé | Notes |
|--------|-----------|-------|-------|
| SENTRY_AUTH_TOKEN | ⬜ | ⬜ | Optionnel |
| SENTRY_ORG | ⬜ | ⬜ | Optionnel |
| SENTRY_PROJECT | ⬜ | ⬜ | Optionnel |

---

*Mis à jour: 2026-02-01*
