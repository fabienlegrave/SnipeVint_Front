/**
 * Script standalone pour générer les cookies via Puppeteer
 * Exécuté via child_process pour éviter les problèmes d'analyse statique Next.js
 */

async function generateCookies() {
  try {
    // Import dynamique de puppeteer
    let puppeteer
    
    try {
      const puppeteerExtra = require('puppeteer-extra')
      const StealthPlugin = require('puppeteer-extra-plugin-stealth')
      puppeteerExtra.use(StealthPlugin())
      puppeteer = puppeteerExtra
      console.log('✅ Utilisation de puppeteer-extra avec plugin stealth')
    } catch (error) {
      puppeteer = require('puppeteer')
      console.log('✅ Utilisation de puppeteer standard')
    }

    console.log('🌐 Démarrage du navigateur headless...')

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        '--disable-gpu',
      ],
    })

    try {
      const page = await browser.newPage()

      // Masquer les signaux d'automatisation
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        })

        window.chrome = {
          runtime: {},
        }

        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)

        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        })

        Object.defineProperty(navigator, 'languages', {
          get: () => ['fr-FR', 'fr', 'en-US', 'en'],
        })
      })

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
      )

      await page.setViewport({ width: 1920, height: 1080 })

      console.log('🌐 Navigation vers Vinted...')

      await page.goto('https://www.vinted.fr', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      await page.waitForTimeout(3000)

      const title = await page.title()
      if (title.includes('Just a moment') || title.includes('Checking your browser')) {
        console.log('⏳ Cloudflare challenge détecté, attente...')
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
        } catch (error) {
          console.warn('⚠️ Timeout lors de l\'attente du challenge Cloudflare')
        }
      }

      const cookies = await page.cookies('https://www.vinted.fr')
      console.log(`🍪 ${cookies.length} cookies récupérés`)

      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ')

      const hasCfClearance = cookies.some(c => c.name === 'cf_clearance')
      const hasDatadome = cookies.some(c => c.name.includes('datadome'))
      const hasAccessToken = cookies.some(c => c.name === 'access_token_web')

      if (!hasAccessToken) {
        console.warn('⚠️ access_token_web non trouvé dans les cookies générés')
      } else {
        console.log('✅ access_token_web trouvé dans les cookies générés')
      }

      await browser.close()

      const result = {
        success: true,
        cookies: cookieString,
        details: {
          cf_clearance: cookies.find(c => c.name === 'cf_clearance')?.value,
          datadome: cookies.find(c => c.name.includes('datadome'))?.value,
          access_token_web: cookies.find(c => c.name === 'access_token_web')?.value,
        }
      }

      // Output JSON pour que le parent puisse le lire
      console.log(JSON.stringify(result))
      process.exit(0)

    } catch (error) {
      await browser.close()
      throw error
    }

  } catch (error) {
    const result = {
      success: false,
      error: error.message || 'Unknown error',
      details: {
        message: 'Failed to generate cookies with Puppeteer'
      }
    }
    console.error(JSON.stringify(result))
    process.exit(1)
  }
}

generateCookies()

