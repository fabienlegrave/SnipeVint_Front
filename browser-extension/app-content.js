// Content script pour l'app (à injecter dans l'app web)
// Ce script permet à l'extension de communiquer avec l'app

(function() {
  'use strict';
  
  // Écouter les messages depuis l'extension
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'VINTED_COOKIES') {
        // Envoyer les cookies à la page via un événement personnalisé
        const event = new CustomEvent('vintedCookiesReceived', {
          detail: {
            cookies: request.cookies,
            timestamp: Date.now()
          }
        })
        window.dispatchEvent(event)
        
        sendResponse({ success: true })
        return true
      }
    })
  }
  
  // Écouter les messages postMessage depuis vinted.fr (si le content script y est injecté)
  window.addEventListener('message', (event) => {
    // Sécuriser : seulement accepter depuis vinted.fr
    if (event.origin.includes('vinted.fr') && event.data.type === 'VINTED_COOKIES_EXTRACTED') {
      const customEvent = new CustomEvent('vintedCookiesReceived', {
        detail: {
          cookies: event.data.cookies,
          timestamp: event.data.timestamp
        }
      })
      window.dispatchEvent(event)
    }
  })
})()

