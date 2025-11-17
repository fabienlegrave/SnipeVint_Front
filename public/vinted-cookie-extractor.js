/**
 * Script d'extraction automatique des cookies Vinted
 * À injecter dans la console de vinted.fr ou via une extension
 */

(function() {
  'use strict';
  
  // Vérifier qu'on est bien sur vinted.fr
  if (!window.location.hostname.includes('vinted.fr')) {
    console.error('❌ Ce script doit être exécuté sur vinted.fr');
    return;
  }
  
  // Fonction pour copier dans le presse-papier
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      document.body.removeChild(textarea);
      return false;
    }
  }
  
  // Extraire les cookies
  const cookies = document.cookie;
  
  if (!cookies || cookies.length === 0) {
    alert('❌ Aucun cookie trouvé. Assurez-vous d\'être connecté.');
    return;
  }
  
  // Copier dans le presse-papier
  const copied = copyToClipboard(cookies);
  
  if (copied) {
    // Notifier l'utilisateur
    const message = '✅ Cookies copiés dans le presse-papier !\n\n' +
      'Maintenant:\n' +
      '1. Revenez sur votre application\n' +
      '2. Allez sur la page "Cookies"\n' +
      '3. Collez les cookies (Ctrl+V / Cmd+V)\n' +
      '4. Cliquez sur "Sauvegarder"';
    
    alert(message);
    
    // Essayer d'envoyer un message à l'app si elle est ouverte
    try {
      window.postMessage({
        type: 'VINTED_COOKIES_EXTRACTED',
        cookies: cookies,
        timestamp: Date.now()
      }, '*');
    } catch (e) {
      // Ignorer les erreurs
    }
  } else {
    // Fallback
    prompt('Cookies extraits (copiez manuellement):', cookies);
  }
})();

