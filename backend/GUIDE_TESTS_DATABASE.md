# 📚 GUIDE : TESTS AVEC BASE DE DONNÉES

**Date** : 5 février 2026  
**Solution** : ✅ Base de données de test réelle

---

## 🚀 CONFIGURATION INITIALE

### 1. Créer la base de données de test

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE africonnect_test;

# Quitter
\q
```

### 2. Configurer les variables d'environnement

```bash
# Copier le fichier exemple
cp .env.test.example .env.test

# Éditer .env.test avec vos credentials
DATABASE_URL="postgresql://user:password@localhost:5432/africonnect_test?schema=public"
```

### 3. Exécuter les migrations sur la DB de test

```bash
# Option 1 : Utiliser DATABASE_URL depuis .env.test
export DATABASE_URL="postgresql://user:password@localhost:5432/africonnect_test?schema=public"
npx prisma migrate deploy

# Option 2 : Utiliser --schema avec un schema.prisma spécifique (si nécessaire)
```

---

## 🧪 EXÉCUTER LES TESTS

```bash
# Tous les tests
npm test

# Un fichier spécifique
npm test -- order.service.test.ts

# Mode watch
npm run test:watch

# Avec coverage
npm run test:coverage
```

---

## 📋 FONCTIONNEMENT

### Setup (`__tests__/setup.ts`)
- ✅ Se connecte à la DB de test
- ✅ Configure Prisma pour les tests
- ✅ Nettoie la DB avant tous les tests (optionnel)

### Chaque test (`beforeEach`)
- ✅ Nettoie les données de test précédentes
- ✅ Crée les données de test nécessaires (users, products, etc.)

### Après chaque test (`afterEach`)
- ✅ Nettoie les données créées pendant le test

---

## ✅ AVANTAGES

1. **Tests réalistes** - Vérifie que le code fonctionne vraiment avec Prisma
2. **Détecte les erreurs SQL** - Trouve les problèmes de schéma/requêtes
3. **Pas de problèmes de mocking** - Évite les complexités avec Jest + ES modules
4. **Recommandé par Prisma** - C'est la méthode officielle

---

## ⚠️ NOTES IMPORTANTES

1. **Isolation** - Chaque test est isolé grâce au nettoyage dans `beforeEach`/`afterEach`
2. **Performance** - Les tests sont légèrement plus lents mais acceptables
3. **Base de données** - Nécessite une DB PostgreSQL de test dédiée
4. **Migrations** - Les migrations doivent être à jour sur la DB de test

---

## 🔧 DÉPANNAGE

### Erreur : "Database connection failed"
- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans `.env.test`
- Vérifier que la DB `africonnect_test` existe

### Erreur : "Relation does not exist"
- Exécuter les migrations : `npx prisma migrate deploy`
- Vérifier que le schéma est correct

### Tests lents
- Normal avec une vraie DB
- Peut être optimisé avec des transactions (à implémenter si nécessaire)

---

**✅ SOLUTION IMPLÉMENTÉE ET PRÊTE À ÊTRE UTILISÉE**
