#!/bin/sh
# Cleanup viewers inactifs des lives — à appeler périodiquement (ex. toutes les 2 min)
# Nécessite de lister les live_id actifs ou d’avoir un endpoint global.
# Pour l’instant : appeler manuellement par live actif ou via un job backend.

API_URL="${API_URL:-http://localhost:3000}"
# Auth requis : passer un token admin ou un secret dédié si vous ajoutez une route protégée.
# Exemple avec une route GET /api/live/active-ids (à implémenter si besoin) puis pour chaque id:
# for id in $(curl -s "${API_URL}/api/live/active-ids"); do
#   curl -s -X POST "${API_URL}/api/live/${id}/cleanup-viewers" -H "Authorization: Bearer $TOKEN"
# done

echo "Configurer API_URL et un mécanisme d’auth. Voir DEPLOIEMENT.md."
