#!/usr/bin/env tsx

/**
 * Script de test pour la génération de cookies via Puppeteer
 * Usage: npx tsx scripts/test-cookie-generation.ts
 */

import { generateVintedCookiesWithPuppeteer } from '../lib/scrape/cookieGenerator'
import { logger } from '../lib/logger'

async function main() {
  console.log('🧪 Test de génération de cookies via Puppeteer...\n')

  try {
    const result = await generateVintedCookiesWithPuppeteer()

    if (result.success) {
      console.log('\n✅ SUCCÈS ! Cookies générés avec succès\n')
      console.log(`🍪 Nombre de cookies: ${result.cookies?.split(';').length || 0}`)
      console.log(`\n📋 Détails:`)
      console.log(`   - cf_clearance: ${result.details?.cf_clearance ? '✅ Présent' : '❌ Absent'}`)
      console.log(`   - datadome: ${result.details?.datadome ? '✅ Présent' : '❌ Absent'}`)
      console.log(`   - access_token_web: ${result.details?.access_token_web ? '✅ Présent' : '❌ Absent'}`)
      
      if (result.details?.cf_clearance) {
        console.log(`\n🔑 cf_clearance (premiers caractères): ${result.details.cf_clearance.substring(0, 20)}...`)
      }
      
      if (result.details?.access_token_web) {
        console.log(`\n🔑 access_token_web (premiers caractères): ${result.details.access_token_web.substring(0, 20)}...`)
      }
      
      console.log(`\n📝 Cookies complets (premiers 100 caractères):`)
      console.log(`   ${result.cookies?.substring(0, 100)}...`)
      
      console.log('\n✅ Test réussi ! Les cookies peuvent être utilisés.')
    } else {
      console.log('\n❌ ÉCHEC de la génération de cookies\n')
      console.log(`Erreur: ${result.error}`)
      if (result.details) {
        console.log(`Détails: ${JSON.stringify(result.details, null, 2)}`)
      }
      
      if (result.error?.includes('Puppeteer not installed')) {
        console.log('\n💡 Solution:')
        console.log('   npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth')
      }
      
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error)
    process.exit(1)
  }
}

main().catch(console.error)

