#!/bin/bash
# Script pour vérifier et créer le worker si nécessaire

echo "🔍 Vérification du statut du worker..."
fly status --app vinted-last

echo ""
echo "📋 Machines actives :"
fly machines list --app vinted-last

echo ""
echo "💡 Si le worker n'existe pas, exécutez :"
echo "   fly scale count worker=1 --app vinted-last"

