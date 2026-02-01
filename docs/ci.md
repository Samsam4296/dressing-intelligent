# CI/CD Pipeline

Guide du pipeline d'intégration continue pour **Dressing Intelligent**.

## Vue d'ensemble

Le pipeline CI se compose de plusieurs stages exécutés sur GitHub Actions:

```
┌─────────────────────────────────────────────────────────────┐
│                        PIPELINE CI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────┐                                      │
│   │   1. Lint        │  ESLint + Prettier + TypeCheck       │
│   └────────┬─────────┘                                      │
│            │                                                │
│   ┌────────▼─────────┐  ┌─────────────────────┐            │
│   │   2. Test (S1)   │  │   2. Test (S2)      │  Parallel  │
│   └────────┬─────────┘  └─────────┬───────────┘            │
│            │                      │                         │
│   ┌────────▼──────────────────────▼───────────┐            │
│   │           3. Expo Doctor                   │            │
│   └────────────────────┬──────────────────────┘            │
│                        │                                    │
│   ┌────────────────────▼──────────────────────┐            │
│   │        4. Sentry Release (main only)       │            │
│   └───────────────────────────────────────────┘            │
│                                                             │
│   ┌───────────────────────────────────────────┐            │
│   │   🔥 Burn-In (PRs to main + weekly)       │  Parallel  │
│   └───────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Stages

### 1. Lint & TypeCheck

- **ESLint**: Vérifie la qualité du code
- **Prettier**: Vérifie le formatage
- **TypeScript**: Vérifie les types

```bash
pnpm lint && pnpm typecheck
```

### 2. Tests Unitaires

Exécution parallèle sur 2 shards avec couverture de code:

- **Coverage HTML**: Rapport détaillé
- **Artifacts**: Uploadés en cas d'échec

```bash
pnpm test -- --coverage --shard=1/2
pnpm test -- --coverage --shard=2/2
```

### 3. Expo Doctor

Vérifie la santé du projet Expo:

- Compatibilité des dépendances
- Configuration correcte
- Avertissements de mise à jour

### 4. Burn-In (Détection Flaky)

**10 itérations** pour détecter les tests non-déterministes.

S'exécute:
- Sur les PRs vers `main`
- Chaque dimanche à 3h UTC

Un seul échec = tests flaky à corriger avant merge.

### 5. Sentry Release

Sur `main` uniquement: upload des source maps pour le debugging en production.

## Exécution Locale

### Pipeline complet

```bash
./scripts/ci-local.sh
```

Exécute: Lint → TypeCheck → Tests → Expo Doctor → Mini Burn-In (3 itérations)

### Burn-In manuel

```bash
# 10 itérations (défaut)
./scripts/burn-in.sh

# 5 itérations
./scripts/burn-in.sh 5

# 100 itérations (haute confiance)
./scripts/burn-in.sh 100
```

### Tests sélectifs

```bash
# Tests uniquement pour les fichiers modifiés
./scripts/test-changed.sh
```

## Debugging CI

### Consulter les artifacts

1. Allez sur l'onglet **Actions** du repo GitHub
2. Cliquez sur le workflow échoué
3. Téléchargez les artifacts (`test-failures-*`, `burn-in-failures`)

### Reproduire localement

```bash
# Reproduire exactement l'environnement CI
./scripts/ci-local.sh
```

### Logs détaillés

```bash
# Tests avec output complet
pnpm test -- --verbose

# Un seul test
pnpm test -- --testPathPattern="MonTest"
```

## Performance

| Stage | Cible | Actuel |
|-------|-------|--------|
| Lint & TypeCheck | < 2 min | ~1 min |
| Tests (par shard) | < 5 min | ~1 min |
| Expo Doctor | < 1 min | ~30s |
| Burn-In | < 15 min | ~10 min |
| **Total** | **< 20 min** | **~12 min** |

## Badge

Ajoutez ce badge à votre README:

```markdown
![Tests](https://github.com/OWNER/REPO/actions/workflows/test.yml/badge.svg)
```

## Voir aussi

- [ci-secrets-checklist.md](./ci-secrets-checklist.md) - Secrets requis
- [.github/workflows/test.yml](../.github/workflows/test.yml) - Configuration complète
