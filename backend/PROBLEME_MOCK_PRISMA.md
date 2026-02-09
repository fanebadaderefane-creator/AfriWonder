# ⚠️ PROBLÈME MOCK PRISMA

**Date** : 5 février 2026  
**Problème** : Les mocks Prisma ne fonctionnent pas avec Jest et ES modules

---

## 🔍 DIAGNOSTIC

Le problème principal est que **Jest avec ES modules ne mocke pas correctement les imports par défaut** de Prisma.

### Erreurs observées :
1. `Foreign key constraint violated` → Le vrai Prisma est utilisé au lieu du mock
2. `Cannot read properties of undefined` → Le mock n'est pas appliqué correctement
3. `mockResolvedValue is not a function` → Les fonctions mockées ne sont pas des vraies fonctions Jest

---

## 💡 SOLUTIONS POSSIBLES

### Solution 1 : Utiliser `@prisma/client` mock directement
Créer un mock manuel de `@prisma/client` au lieu de mocker `database.ts`

### Solution 2 : Modifier l'architecture
Injecter Prisma comme dépendance dans les services au lieu de l'importer directement

### Solution 3 : Utiliser `jest.mock` avec factory function
Créer le mock dans une factory function qui retourne toujours la même instance

### Solution 4 : Utiliser un test database
Créer une vraie base de données de test au lieu de mocker Prisma

---

## 📋 FICHIERS CONCERNÉS

- `backend/src/config/database.ts` → Crée un vrai PrismaClient même en mode test
- `backend/src/__tests__/order.service.test.ts` → Tente de mocker Prisma mais échoue
- `backend/src/config/__mocks__/database.ts` → Mock créé mais non utilisé

---

## 🚀 RECOMMANDATION

**Utiliser une base de données de test** avec Prisma plutôt que de mocker Prisma. C'est plus fiable et teste réellement les interactions avec la base de données.

OU

**Injecter Prisma comme dépendance** dans les services pour faciliter le mocking.

---

**STATUT** : ⚠️ **EN ATTENTE DE SOLUTION**
