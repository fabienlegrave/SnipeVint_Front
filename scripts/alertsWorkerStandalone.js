/**
 * Worker GitHub Actions standalone pour vérifier les alertes Vinted
 * 
 * Version qui utilise directement les fonctions backend sans passer par l'API HTTP
 * Nécessite ts-node pour exécuter les fichiers TypeScript
 * 
 * Usage:
 *   npm install -g ts-node typescript
 *   ts-node scripts/alertsWorkerStandalone.js
 * 
 * Ou avec tsx (plus rapide):
 *   npm install -g tsx
 *   tsx scripts/alertsWorkerStandalone.js
 */

// Configuration depuis les variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  process.exit(1)
}

// Note: Ce script nécessite ts-node ou tsx pour exécuter les modules TypeScript
// Pour GitHub Actions, on utilise plutôt alertsWorker.js qui appelle l'API HTTP

async function main() {
  console.log('🚀 Démarrage du worker standalone d\'alertes...')
  console.log(`📅 ${new Date().toISOString()}`)
  console.log('')
  console.log('⚠️  Ce script nécessite ts-node ou tsx pour exécuter les modules TypeScript.')
  console.log('💡 Pour GitHub Actions, utilisez plutôt scripts/alertsWorker.js qui appelle l\'API HTTP.')
  console.log('')
  console.log('Pour utiliser cette version standalone:')
  console.log('  1. npm install -g tsx')
  console.log('  2. tsx scripts/alertsWorkerStandalone.ts')
  console.log('')
  
  // Essayer d'importer le module TypeScript
  try {
    // Cette approche nécessite que le projet soit compilé ou qu'on utilise ts-node/tsx
    const { checkAlertsStandalone } = await import('../lib/alerts/checkAlertsStandalone')
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 1. Récupérer les credentials
    console.log('🔐 Récupération des credentials Vinted...')
    const { data: credentials, error: credError } = await supabase
      .from('vinted_credentials')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (credError || !credentials) {
      console.error('❌ Aucun credential actif trouvé. Arrêt du worker.')
      process.exit(1)
    }

    console.log(`✅ Credentials trouvés (ID: ${credentials.id}, User: ${credentials.user_id || 'N/A'})`)

    // 2. Vérifier les alertes
    console.log('🔍 Vérification des alertes...')
    const result = await checkAlertsStandalone(credentials.full_cookies)

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

    // 3. Mettre à jour last_used_at
    await supabase
      .from('vinted_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', credentials.id)
    console.log('✅ Credentials mis à jour (last_used_at)')

    // 4. Afficher les matches trouvés
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

