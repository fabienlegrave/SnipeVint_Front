// Background service worker for the extension

// Écouter les messages depuis content scripts et popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_COOKIES' || request.type === 'EXTRACT_COOKIES') {
    // Récupérer TOUS les cookies de vinted.fr (y compris HttpOnly comme access_token_web)
    chrome.cookies.getAll({ domain: 'vinted.fr' }, (cookies) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message })
        return
      }
      
      if (!cookies || cookies.length === 0) {
        sendResponse({ error: 'No cookies found' })
        return
      }
      
      const cookieString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ')
      
      // Vérifier que access_token_web est présent
      const hasAccessToken = cookies.some(c => c.name === 'access_token_web')
      
      sendResponse({ 
        cookies: cookieString, 
        count: cookies.length,
        hasAccessToken: hasAccessToken
      })
    })
    
    return true // Indique qu'on répondra de manière asynchrone
  }
})

// Écouter les changements de cookies pour détecter les connexions
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('vinted.fr') && changeInfo.cookie.name === '_vinted_fr_session') {
    // Une session Vinted a changé, notifier l'app si elle est ouverte
    chrome.tabs.query({ url: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*'] }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'VINTED_SESSION_CHANGED'
        }).catch(() => {
          // Ignorer les erreurs si l'app n'a pas de content script
        })
      }
    })
  }
})

