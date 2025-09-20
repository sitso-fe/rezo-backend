/**
 * Service d'envoi d'emails avec SendGrid
 * Alternative flexible et gratuite pour l'envoi d'emails
 */
const sgMail = require('@sendgrid/mail');

// Initialiser SendGrid de manière conditionnelle
let isInitialized = false;

const initializeSendGrid = () => {
  if (!isInitialized && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    isInitialized = true;
    console.log('✅ SendGrid initialisé avec succès');
  }
  return isInitialized;
};

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
    
    if (!initializeSendGrid()) {
      throw new Error("SendGrid non configuré - vérifiez SENDGRID_API_KEY");
    }

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
            .security-note {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
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
            
            <div class="security-note">
              <strong>🔒 Sécurité</strong><br>
              Ce lien expire dans 10 minutes pour votre sécurité. Si vous n'avez pas demandé cette connexion, ignorez cet email.
            </div>
            
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
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'Rezo <noreply@rezo.app>',
      subject: '🎵 Votre lien magique Rezo',
      text: textContent,
      html: htmlContent,
    };

    // Envoyer l'email
    const result = await sgMail.send(msg);
    
    console.log('✅ Email envoyé avec succès via SendGrid');
    return {
      success: true,
      messageId: result[0].headers['x-message-id'],
      email: email,
      magicLink: magicLink,
      testToken: token,
      provider: 'SendGrid'
    };

  } catch (error) {
    console.error('❌ Erreur envoi email SendGrid:', error);
    throw new Error(`Erreur envoi email: ${error.message}`);
  }
};

/**
 * Tester la configuration SendGrid
 * @returns {Promise<boolean>} True si la configuration est valide
 */
const testSendGridConfiguration = async () => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('❌ SENDGRID_API_KEY non configurée');
      return false;
    }

    if (!initializeSendGrid()) {
      console.log('❌ Impossible d\'initialiser SendGrid');
      return false;
    }

    // Test simple avec un email de test
    const msg = {
      to: 'test@example.com',
      from: process.env.SENDGRID_FROM_EMAIL || 'Rezo <noreply@rezo.app>',
      subject: 'Test Configuration SendGrid',
      text: 'Test de configuration SendGrid réussi !',
      html: '<p>Test de configuration SendGrid réussi !</p>',
    };

    const result = await sgMail.send(msg);
    console.log('✅ Configuration SendGrid valide:', result[0].statusCode);
    return true;

  } catch (error) {
    console.error('❌ Erreur test configuration SendGrid:', error);
    return false;
  }
};

/**
 * Obtenir les statistiques d'envoi
 * @returns {Promise<Object>} Statistiques des emails
 */
const getEmailStats = async () => {
  try {
    return {
      status: 'active',
      provider: 'SendGrid',
      message: 'Service actif',
      dailyLimit: '100 emails/jour (gratuit)',
      monthlyLimit: '3000 emails/mois (gratuit)'
    };
  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    return { status: 'error', message: error.message };
  }
};

module.exports = {
  sendMagicLink,
  testSendGridConfiguration,
  getEmailStats
};

