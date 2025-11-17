/**
 * Bookmarklet pour extraire automatiquement les cookies Vinted
 * 
 * Instructions:
 * 1. Créez un nouveau bookmark dans votre navigateur
 * 2. Nommez-le "Extract Vinted Cookies"
 * 3. Collez ce code dans l'URL du bookmark (remplacez le https://...)
 * 4. Allez sur vinted.fr (connecté)
 * 5. Cliquez sur le bookmark
 * 6. Les cookies seront copiés dans le presse-papier et affichés
 */

javascript:(function(){
  // Fonction pour extraire les cookies du domaine actuel
  function extractCookies() {
    const cookies = document.cookie;
    
    if (!cookies || cookies.length === 0) {
      alert('❌ Aucun cookie trouvé. Assurez-vous d\'être connecté sur vinted.fr');
      return null;
    }
    
    // Vérifier qu'on est bien sur vinted.fr
    if (!window.location.hostname.includes('vinted.fr')) {
      alert('⚠️ Vous devez être sur vinted.fr pour extraire les cookies');
      return null;
    }
    
    return cookies;
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
      document.execCommand('copy');
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
  
  // Extraire les cookies
  const cookies = extractCookies();
  
  if (cookies) {
    // Copier dans le presse-papier
    const copied = copyToClipboard(cookies);
    
    // Afficher un message
    const message = copied 
      ? '✅ Cookies copiés dans le presse-papier !\n\nCollez-les maintenant dans TokenManager.'
      : '📋 Cookies extraits (copie manuelle nécessaire):\n\n';
    
    // Afficher dans une popup
    const popup = window.open('', 'cookieExtractor', 'width=600,height=400');
    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vinted Cookies Extractor</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 {
              color: #09b1ba;
              margin-top: 0;
            }
            textarea {
              width: 100%;
              min-height: 200px;
              padding: 10px;
              border: 2px solid #e0e0e0;
              border-radius: 4px;
              font-family: monospace;
              font-size: 12px;
              margin: 10px 0;
            }
            button {
              background: #09b1ba;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              margin-right: 10px;
            }
            button:hover {
              background: #07a0a8;
            }
            .success {
              color: #10b981;
              font-weight: bold;
              margin: 10px 0;
            }
            .info {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 10px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🍪 Vinted Cookies Extractor</h1>
            ${copied ? '<div class="success">✅ Cookies copiés dans le presse-papier !</div>' : ''}
            <div class="info">
              <strong>Instructions:</strong><br>
              1. Cliquez sur "Copier" ci-dessous<br>
              2. Allez dans votre app → TokenManager<br>
              3. Collez les cookies dans le champ "Full Cookies"<br>
              4. Cliquez sur "Save"
            </div>
            <textarea id="cookieText" readonly>${cookies}</textarea>
            <button onclick="copyCookies()">📋 Copier les cookies</button>
            <button onclick="window.close()">Fermer</button>
          </div>
          <script>
            function copyCookies() {
              const textarea = document.getElementById('cookieText');
              textarea.select();
              document.execCommand('copy');
              alert('✅ Cookies copiés !');
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  }
})();

