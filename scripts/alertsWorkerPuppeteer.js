#!/usr/bin/env node

/**
 * Worker autonome pour vérifier les alertes Vinted
 * Utilise Puppeteer pour générer automatiquement les cookies et vérifier les alertes
 * 
 * Ce script :
 * 1. Génère les cookies via Puppeteer (si nécessaire)
 * 2. Lit les alertes actives depuis la DB
 * 3. Vérifie chaque alerte contre l'API Vinted
 * 4. Sauvegarde les matches trouvés
 * 5. Met à jour last_check_at
 * 6. Tourne en boucle toutes les X minutes
 * 
 * Usage:
 *   node scripts/alertsWorkerPuppeteer.js
 * 
 * Variables d'environnement requises:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   API_SECRET (optionnel)
 *   CHECK_INTERVAL_MINUTES (défaut: 5)
 */

// Charger les variables d'environnement depuis .env.local si disponible
try {
  require('dotenv').config({ path: '.env.local' })
} catch (error) {
  // dotenv non installé ou .env.local non trouvé, continuer avec process.env
}

const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')

// Configuration depuis les variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_SECRET = process.env.API_SECRET || 'vinted_scraper_secure_2024'
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * Génère les cookies via Puppeteer
 */
async function generateCookiesWithPuppeteer() {
  try {
    console.log('🔄 Génération des cookies via Puppeteer...')
    
    // Importer dynamiquement pour éviter les erreurs si Puppeteer n'est pas installé
    let puppeteer
    try {
      const puppeteerExtra = require('puppeteer-extra')
      const StealthPlugin = require('puppeteer-extra-plugin-stealth')
      puppeteerExtra.use(StealthPlugin())
      puppeteer = puppeteerExtra
    } catch (error) {
      try {
        puppeteer = require('puppeteer')
      } catch (error2) {
        console.error('❌ Puppeteer non installé. Installez: npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth')
        return null
      }
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    try {
      const page = await browser.newPage()

      // Masquer les signaux d'automatisation
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
        ;(window).chrome = { runtime: {} }
      })

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
      )

      console.log('🌐 Navigation vers Vinted...')
      await page.goto('https://www.vinted.fr', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Attendre le challenge Cloudflare si présent
      await page.waitForTimeout(3000)
      const title = await page.title()
      if (title.includes('Just a moment') || title.includes('Checking your browser')) {
        console.log('⏳ Cloudflare challenge détecté, attente...')
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
        } catch (error) {
          console.warn('⚠️ Timeout lors de l\'attente du challenge Cloudflare')
        }
      }

      // Récupérer les cookies
      const cookies = await page.cookies('https://www.vinted.fr')
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      await browser.close()

      console.log(`✅ Cookies générés: ${cookies.length} cookies`)
      return cookieString

    } catch (error) {
      await browser.close()
      throw error
    }

  } catch (error) {
    console.error('❌ Erreur lors de la génération des cookies:', error.message)
    return null
  }
}

/**
 * Récupère ou génère les cookies Vinted
 */
async function getOrGenerateCookies() {
  // Essayer d'abord de récupérer depuis la DB
  const { data: credentials, error } = await supabase
    .from('vinted_credentials')
    .select('full_cookies, last_used_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!error && credentials && credentials.full_cookies) {
    console.log('✅ Cookies récupérés depuis la DB')
    return credentials.full_cookies
  }

  // Si pas de cookies en DB, générer avec Puppeteer
  console.log('⚠️ Aucun cookie en DB, génération via Puppeteer...')
  const newCookies = await generateCookiesWithPuppeteer()

  if (newCookies) {
    // Sauvegarder en DB
    await supabase.from('vinted_credentials').insert({
      full_cookies: newCookies,
      notes: 'Auto-generated via Puppeteer worker',
      is_active: true
    })
    console.log('✅ Cookies sauvegardés en DB')
  }

  return newCookies
}

/**
 * Vérifie les alertes en utilisant l'API HTTP
 * Note: Pour utiliser la version standalone, il faudrait transpiler TypeScript ou utiliser ts-node
 */
async function checkAlerts(fullCookies) {
  try {
    // Utiliser l'API HTTP (plus simple et fonctionne partout)
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
    
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
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des alertes:', error.message)
    throw error
  }
}

/**
 * Boucle principale du worker
 */
async function runWorker() {
  console.log('🚀 Démarrage du worker d\'alertes...')
  console.log(`⏰ Intervalle de vérification: ${CHECK_INTERVAL_MINUTES} minutes`)

  while (true) {
    try {
      const startTime = new Date()
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🔄 Vérification des alertes - ${startTime.toISOString()}`)
      console.log(`${'='.repeat(60)}`)

      // 1. Récupérer ou générer les cookies
      const fullCookies = await getOrGenerateCookies()
      if (!fullCookies) {
        console.error('❌ Impossible d\'obtenir les cookies, attente de la prochaine itération...')
        await sleep(CHECK_INTERVAL_MINUTES * 60 * 1000)
        continue
      }

      // 2. Vérifier les alertes
      const result = await checkAlerts(fullCookies)

      if (result.success) {
        console.log(`✅ Vérification terminée:`)
        console.log(`   - Alertes vérifiées: ${result.alertsChecked}`)
        console.log(`   - Items vérifiés: ${result.itemsChecked || result.totalItemsChecked || 0}`)
        console.log(`   - Matches trouvés: ${result.matches?.length || 0}`)
        
        if (result.matches && result.matches.length > 0) {
          console.log(`\n🎯 Matches trouvés:`)
          result.matches.forEach(match => {
            console.log(`   - Alerte "${match.alertTitle}": ${match.item.title} (${match.matchReason})`)
          })
        }
      } else {
        console.error(`❌ Échec de la vérification: ${result.error}`)
      }

      const endTime = new Date()
      const duration = Math.round((endTime - startTime) / 1000)
      console.log(`\n⏱️  Durée: ${duration}s`)
      console.log(`⏰ Prochaine vérification dans ${CHECK_INTERVAL_MINUTES} minutes...`)

    } catch (error) {
      console.error('❌ Erreur dans le worker:', error.message)
      console.error(error.stack)
    }

    // Attendre avant la prochaine itération
    await sleep(CHECK_INTERVAL_MINUTES * 60 * 1000)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt du worker...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Arrêt du worker...')
  process.exit(0)
})

// Démarrer le worker
runWorker().catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})

