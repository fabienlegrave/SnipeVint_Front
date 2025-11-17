// Popup script for the extension

document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn')
  const sendToAppBtn = document.getElementById('sendToAppBtn')
  const statusDiv = document.getElementById('status')
  const cookiesPreview = document.getElementById('cookiesPreview')
  
  let extractedCookies = null
  
  function showStatus(message, type = 'info') {
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`
  }
  
  extractBtn.addEventListener('click', async () => {
    try {
      extractBtn.disabled = true
      showStatus('🔍 Extracting cookies from vinted.fr...', 'info')
      
      // Récupérer tous les cookies de vinted.fr
      const cookies = await chrome.cookies.getAll({
        domain: 'vinted.fr'
      })
      
      if (!cookies || cookies.length === 0) {
        showStatus('❌ No cookies found. Make sure you are logged in on vinted.fr', 'error')
        extractBtn.disabled = false
        return
      }
      
      // Vérifier que access_token_web est présent dans les cookies
      const accessTokenCookie = cookies.find(c => c.name === 'access_token_web')
      
      if (!accessTokenCookie) {
        showStatus('⚠️ Warning: access_token_web not found. Make sure you are logged in on vinted.fr and refresh the page.', 'error')
        extractBtn.disabled = false
        return
      }
      
      // Formater comme une string de cookies
      const cookieString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ')
      
      extractedCookies = cookieString
      
      // Afficher un aperçu
      cookiesPreview.textContent = cookieString.substring(0, 200) + '...'
      cookiesPreview.style.display = 'block'
      
      // Copier dans le presse-papier
      await navigator.clipboard.writeText(cookieString)
      
      showStatus(`✅ ${cookies.length} cookies extracted (including access_token_web) and copied to clipboard!`, 'success')
      extractBtn.disabled = false
      sendToAppBtn.style.display = 'block'
      
    } catch (error) {
      console.error('Error extracting cookies:', error)
      showStatus(`❌ Error: ${error.message}`, 'error')
      extractBtn.disabled = false
    }
  })
  
  sendToAppBtn.addEventListener('click', async () => {
    if (!extractedCookies) return
    
    try {
      sendToAppBtn.disabled = true
      showStatus('📤 Sending cookies to app...', 'info')
      
      // Essayer de trouver l'onglet de l'app
      const tabs = await chrome.tabs.query({
        url: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*']
      })
      
      if (tabs.length > 0) {
        // Essayer d'envoyer les cookies à l'app via message
        try {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'VINTED_COOKIES',
            cookies: extractedCookies
          })
          showStatus('✅ Cookies sent to app! They should appear automatically.', 'success')
        } catch (error) {
          // Si l'app n'a pas de content script, utiliser executeScript pour injecter
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: (cookies) => {
                // Envoyer un événement personnalisé à la page
                const event = new CustomEvent('vintedCookiesReceived', {
                  detail: { cookies, timestamp: Date.now() }
                })
                window.dispatchEvent(event)
              },
              args: [extractedCookies]
            })
            showStatus('✅ Cookies sent to app! They should appear automatically.', 'success')
          } catch (e) {
            // Fallback : sauvegarder dans storage
            await chrome.storage.local.set({
              vinted_cookies: extractedCookies,
              vinted_cookies_timestamp: Date.now()
            })
            showStatus('✅ Cookies saved! Go to /extract-cookies in your app and click "Check Extension".', 'success')
          }
        }
      } else {
        // Sauvegarder dans storage pour que l'app puisse les récupérer
        await chrome.storage.local.set({
          vinted_cookies: extractedCookies,
          vinted_cookies_timestamp: Date.now()
        })
        showStatus('✅ Cookies saved! Go to /extract-cookies in your app and click "Check Extension".', 'success')
      }
    } catch (error) {
      console.error('Error sending cookies:', error)
      showStatus(`❌ Error: ${error.message}`, 'error')
    } finally {
      sendToAppBtn.disabled = false
    }
  })
  
  // Vérifier si on est sur vinted.fr
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('vinted.fr')) {
      showStatus('✅ You are on vinted.fr - ready to extract!', 'success')
    } else {
      showStatus('ℹ️ Go to vinted.fr first, then click Extract', 'info')
    }
  })
})
