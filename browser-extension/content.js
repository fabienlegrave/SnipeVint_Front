// Content script qui s'exécute sur vinted.fr

// Écouter les messages depuis l'extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_COOKIES') {
    // Extraire les cookies de la page actuelle
    const cookies = document.cookie
    
    // Copier dans le presse-papier
    navigator.clipboard.writeText(cookies).then(() => {
      // Envoyer un message à l'app si elle est ouverte
      window.postMessage({
        type: 'VINTED_COOKIES_EXTRACTED',
        cookies: cookies,
        timestamp: Date.now()
      }, '*')
      
      sendResponse({ success: true, cookies })
    }).catch((error) => {
      sendResponse({ success: false, error: error.message })
    })
    
    return true
  }
})

// Injecter un bouton dans la page vinted.fr pour extraction rapide
function injectExtractButton() {
  // Vérifier si le bouton existe déjà
  if (document.getElementById('vinted-scraper-extract-btn')) {
    return
  }
  
  const button = document.createElement('button')
  button.id = 'vinted-scraper-extract-btn'
  button.textContent = '🍪 Extract Cookies'
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 20px;
    background: #09b1ba;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `
  
  button.addEventListener('click', async () => {
    try {
      button.textContent = '⏳ Extracting...'
      button.disabled = true
      
      // Utiliser l'API Chrome pour obtenir TOUS les cookies (y compris HttpOnly)
      // Si on est dans un content script, on doit demander au background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Envoyer un message au background script pour extraire les cookies
        chrome.runtime.sendMessage({ type: 'EXTRACT_COOKIES' }, (response) => {
          if (chrome.runtime.lastError) {
            // Fallback : utiliser document.cookie (mais ne contiendra pas HttpOnly)
            extractWithDocumentCookie()
            return
          }
          
          if (response && response.cookies) {
            handleCookiesExtracted(response.cookies)
          } else {
            extractWithDocumentCookie()
          }
        })
      } else {
        // Fallback : utiliser document.cookie
        extractWithDocumentCookie()
      }
    } catch (error) {
      alert('❌ Error: ' + error.message)
      button.textContent = '🍪 Extract Cookies'
      button.disabled = false
    }
    
    function extractWithDocumentCookie() {
      const cookies = document.cookie
      
      if (!cookies) {
        alert('❌ No cookies found. Make sure you are logged in.')
        button.textContent = '🍪 Extract Cookies'
        button.disabled = false
        return
      }
      
      // Vérifier que access_token_web est présent
      if (!cookies.includes('access_token_web=')) {
        alert('⚠️ Warning: access_token_web not found.\n\nThis cookie is HttpOnly and cannot be accessed via JavaScript.\n\n💡 Solution: Use the extension popup (click the extension icon) to extract cookies with full access.')
        button.textContent = '🍪 Extract Cookies'
        button.disabled = false
        return
      }
      
      handleCookiesExtracted(cookies)
    }
    
    function handleCookiesExtracted(cookieString) {
      // Copier dans le presse-papier
      navigator.clipboard.writeText(cookieString).then(() => {
        // Envoyer à l'app
        window.postMessage({
          type: 'VINTED_COOKIES_EXTRACTED',
          cookies: cookieString,
          timestamp: Date.now()
        }, '*')
        
        button.textContent = '✅ Copied!'
        button.style.background = '#10b981'
        button.disabled = false
        
        setTimeout(() => {
          button.textContent = '🍪 Extract Cookies'
          button.style.background = '#09b1ba'
        }, 2000)
      }).catch((error) => {
        alert('❌ Error copying cookies: ' + error.message)
        button.textContent = '🍪 Extract Cookies'
        button.disabled = false
      })
    }
  })
  
  document.body.appendChild(button)
}

// Injecter le bouton quand la page est chargée
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectExtractButton)
} else {
  injectExtractButton()
}

