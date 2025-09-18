/**
 * Service d'envoi d'emails avec Resend
 * Alternative moderne et gratuite à Gmail SMTP
 */
const { Resend } = require('resend');

// Initialiser Resend avec la clé API
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envoyer un magic link par email
 * @param {string} email - Email du destinataire
 * @param {string} magicLink - Lien magique généré
 * @param {string} token - Token pour le mode développement
 * @returns {Promise<Object>} Résultat de l'envoi
 */
const sendMagicLink = async (email, magicLink, token = null) => {
  try {
    console.log(`📧 Envoi magic link à: ${email}`);
    
    // Template HTML pour l'email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Votre lien magique Rezo</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              color: #333;
              margin-bottom: 20px;
            }
            .message {
              font-size: 16px;
              color: #666;
              margin-bottom: 30px;
              text-align: center;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 15px 30px;
              border-radius: 50px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              text-align: center;
              color: #999;
              font-size: 14px;
            }
            .dev-info {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              font-family: monospace;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 Rezo</div>
              <h1 class="title">Votre lien magique est prêt !</h1>
            </div>
            
            <div class="message">
              Cliquez sur le bouton ci-dessous pour vous connecter à Rezo et découvrir votre musique émotionnelle.
            </div>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="button">
                🚀 Se connecter à Rezo
              </a>
            </div>
            
            ${token ? `
              <div class="dev-info">
                <strong>🧪 Mode Développement</strong><br>
                Token: <code>${token}</code><br>
                <small>Utilisez ce token pour tester la connexion</small>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>Ce lien expire dans 10 minutes pour votre sécurité.</p>
              <p>Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
              <p>© 2025 Rezo - Plateforme Musicale Émotionnelle</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Version texte simple
    const textContent = `
      🎵 Rezo - Votre lien magique est prêt !
      
      Cliquez sur ce lien pour vous connecter :
      ${magicLink}
      
      ${token ? `\n🧪 Mode Développement - Token: ${token}` : ''}
      
      Ce lien expire dans 10 minutes.
      
      © 2025 Rezo
    `;

    // Configuration de l'email
    const emailData = {
      from: process.env.RESEND_FROM_EMAIL || 'Rezo <onboarding@resend.dev>',
      to: [email],
      subject: '🎵 Votre lien magique Rezo',
      html: htmlContent,
      text: textContent,
    };

    // Envoyer l'email
    const result = await resend.emails.send(emailData);
    
    console.log('✅ Email envoyé avec succès:', result);
    return {
      success: true,
      messageId: result.id,
      email: email,
      magicLink: magicLink,
      testToken: token
    };

  } catch (error) {
    console.error('❌ Erreur envoi email Resend:', error);
    throw new Error(`Erreur envoi email: ${error.message}`);
  }
};

/**
 * Tester la configuration Resend
 * @returns {Promise<boolean>} True si la configuration est valide
 */
const testResendConfiguration = async () => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('❌ RESEND_API_KEY non configurée');
      return false;
    }

    // Test simple avec un email de test
    const testResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Rezo <onboarding@resend.dev>',
      to: ['test@example.com'],
      subject: 'Test Configuration Resend',
      html: '<p>Test de configuration Resend réussi !</p>',
    });

    console.log('✅ Configuration Resend valide:', testResult);
    return true;

  } catch (error) {
    console.error('❌ Erreur test configuration Resend:', error);
    return false;
  }
};

/**
 * Obtenir les statistiques d'envoi
 * @returns {Promise<Object>} Statistiques des emails
 */
const getEmailStats = async () => {
  try {
    // Resend ne fournit pas d'API de stats dans la version gratuite
    // On peut implémenter un système de logging local
    return {
      status: 'active',
      provider: 'Resend',
      message: 'Service actif'
    };
  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    return { status: 'error', message: error.message };
  }
};

module.exports = {
  sendMagicLink,
  testResendConfiguration,
  getEmailStats
};
