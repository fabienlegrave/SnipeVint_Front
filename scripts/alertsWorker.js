/**
 * Worker GitHub Actions pour vérifier les alertes Vinted
 * 
 * Ce script :
 * 1. Lit les cookies Vinted depuis la base de données
 * 2. Lit les alertes actives
 * 3. Vérifie chaque alerte contre l'API Vinted
 * 4. Sauvegarde les matches trouvés
 * 5. Met à jour last_check_at
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')

// Pour utiliser les modules TypeScript/ES6, on peut utiliser ts-node ou transpiler
// Pour l'instant, on utilise l'approche API HTTP avec fallback standalone

// Configuration depuis les variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_SECRET = process.env.API_SECRET || 'vinted_scraper_secure_2024'
// Pour GitHub Actions, utiliser l'URL de l'API déployée
// Pour les tests locaux, utiliser http://localhost:3000
const API_BASE_URL = process.env.API_BASE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * Récupère les credentials Vinted actifs depuis la DB
 */
async function getActiveCredentials() {
  const { data, error } = await supabase
    .from('vinted_credentials')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.error('❌ Aucun credential actif trouvé en base de données')
      return null
    }
    throw error
  }

  return data
}

/**
 * Met à jour last_used_at pour les credentials
 */
async function updateCredentialsLastUsed(credentialId) {
  await supabase
    .from('vinted_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', credentialId)
}

/**
 * Récupère les alertes actives
 */
async function getActiveAlerts() {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Vérifie les alertes en utilisant directement les fonctions backend
 * (standalone, sans dépendre de l'API HTTP)
 */
async function checkAlerts(fullCookies) {
  // Utiliser directement les fonctions backend si disponible
  // Sinon, fallback sur l'API HTTP
  try {
    // Essayer d'utiliser la version standalone
    const { checkAlertsStandalone } = require('../lib/alerts/checkAlertsStandalone')
    console.log('✅ Utilisation de la version standalone (directe)')
    return await checkAlertsStandalone(fullCookies)
  } catch (error) {
    // Fallback: utiliser l'API HTTP si la version standalone n'est pas disponible
    console.log('⚠️ Version standalone non disponible, utilisation de l\'API HTTP')
    console.log(`🌐 Appel de l'API: ${API_BASE_URL}/api/v1/alerts/check`)
    
    const response = await fetch(`${API_BASE_URL}/api/v1/alerts/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_SECRET
      },
      body: JSON.stringify({ fullCookies })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage du worker d\'alertes...')
  console.log(`📅 ${new Date().toISOString()}`)
  
  try {
    // 1. Récupérer les credentials
    console.log('🔐 Récupération des credentials Vinted...')
    const credentials = await getActiveCredentials()
    
    if (!credentials) {
      console.error('❌ Aucun credential actif trouvé. Arrêt du worker.')
      process.exit(1)
    }

    console.log(`✅ Credentials trouvés (ID: ${credentials.id}, User: ${credentials.user_id || 'N/A'})`)

    // 2. Récupérer les alertes actives
    console.log('📋 Récupération des alertes actives...')
    const alerts = await getActiveAlerts()
    
    if (alerts.length === 0) {
      console.log('ℹ️ Aucune alerte active. Arrêt du worker.')
      return
    }

    console.log(`✅ ${alerts.length} alerte(s) active(s) trouvée(s)`)

    // 3. Vérifier les alertes via l'API
    console.log('🔍 Vérification des alertes...')
    const result = await checkAlerts(credentials.full_cookies)

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la vérification des alertes')
    }

    console.log(`✅ Vérification terminée:`)
    console.log(`   - Alertes vérifiées: ${result.alertsChecked}`)
    console.log(`   - Items vérifiés: ${result.itemsChecked}`)
    console.log(`   - Matches trouvés: ${result.matches?.length || 0}`)

    if (result.stats) {
      console.log(`   - Stats: ${result.stats.skippedUnavailable} non-disponibles, ${result.stats.skippedPrice} prix, ${result.stats.skippedPlatform} plateforme, ${result.stats.skippedTitle} titre`)
    }

    // 4. Mettre à jour last_used_at
    await updateCredentialsLastUsed(credentials.id)
    console.log('✅ Credentials mis à jour (last_used_at)')

    // 5. Afficher les matches trouvés
    if (result.matches && result.matches.length > 0) {
      console.log('\n🎯 Matches trouvés:')
      result.matches.forEach((match, idx) => {
        console.log(`   ${idx + 1}. [Alerte: ${match.alertTitle}] ${match.item?.title || 'N/A'} - ${match.item?.price?.amount || 'N/A'}€`)
      })
    }

    console.log('\n✅ Worker terminé avec succès')

  } catch (error) {
    console.error('❌ Erreur dans le worker:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Exécuter le worker
main()
  .then(() => {
    console.log('✅ Worker terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

