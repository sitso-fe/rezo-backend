const nodemailer = require("nodemailer");

// Import conditionnel des services email
let resendSendMagicLink, testResendConfiguration;
let sendgridSendMagicLink, testSendGridConfiguration;

try {
  if (process.env.RESEND_API_KEY) {
    const resendService = require("./resendEmailService");
    resendSendMagicLink = resendService.sendMagicLink;
    testResendConfiguration = resendService.testResendConfiguration;
  }
} catch (error) {
  console.log("📧 Service Resend non disponible:", error.message);
}

try {
  if (process.env.SENDGRID_API_KEY) {
    const sendgridService = require("./sendgridEmailService");
    sendgridSendMagicLink = sendgridService.sendMagicLink;
    testSendGridConfiguration = sendgridService.testSendGridConfiguration;
  }
} catch (error) {
  console.log("📧 Service SendGrid non disponible:", error.message);
}

// Configuration du transporteur email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Template HTML pour les emails de magic link
const getMagicLinkEmailTemplate = (magicLink, userEmail) => {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connexion à Rezo</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        h1 {
          color: #1a202c;
          margin: 0 0 10px;
          font-size: 28px;
        }
        .subtitle {
          color: #718096;
          margin: 0 0 30px;
          font-size: 16px;
        }
        .magic-link-btn {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .magic-link-btn:hover {
          transform: translateY(-2px);
        }
        .info-box {
          background: #f7fafc;
          border-left: 4px solid #667eea;
          padding: 16px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .security-note {
          background: #fef5e7;
          border: 1px solid #f6e05e;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #718096;
          font-size: 14px;
        }
        .link-fallback {
          word-break: break-all;
          background: #f7fafc;
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">R</div>
          <h1>Connexion à Rezo</h1>
          <p class="subtitle">Connecte-toi émotionnellement à travers la musique</p>
        </div>
        
        <p>Salut !</p>
        <p>Tu as demandé à te connecter à Rezo avec l'adresse <strong>${userEmail}</strong>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" class="magic-link-btn">
            🎵 Se connecter à Rezo
          </a>
        </div>
        
        <div class="info-box">
          <p><strong>📱 Utilisation :</strong></p>
          <ul>
            <li>Clique sur le bouton ci-dessus pour te connecter instantanément</li>
            <li>Ce lien est valide pendant <strong>10 minutes</strong></li>
            <li>Il ne peut être utilisé qu'<strong>une seule fois</strong></li>
          </ul>
        </div>
        
        <div class="security-note">
          <p><strong>🔒 Sécurité :</strong></p>
          <p>Si tu n'as pas demandé cette connexion, ignore simplement cet email. Le lien expirera automatiquement.</p>
        </div>
        
        <p><strong>Le bouton ne fonctionne pas ?</strong><br>
        Copie et colle ce lien dans ton navigateur :</p>
        <div class="link-fallback">${magicLink}</div>
        
        <div class="footer">
          <p>Cet email a été envoyé par Rezo<br>
          Si tu as des questions, n'hésite pas à nous contacter.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template texte pour les clients email qui ne supportent pas HTML
const getMagicLinkTextTemplate = (magicLink, userEmail) => {
  return `
Connexion à Rezo

Salut !

Tu as demandé à te connecter à Rezo avec l'adresse ${userEmail}.

Pour te connecter, clique sur ce lien :
${magicLink}

Ce lien est valide pendant 10 minutes et ne peut être utilisé qu'une seule fois.

Si tu n'as pas demandé cette connexion, ignore simplement cet email.

---
Rezo - Connecte-toi émotionnellement à travers la musique
  `;
};

// Template pour l'email de bienvenue
const getWelcomeEmailTemplate = (pseudo) => {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenue sur Rezo !</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: bold;
        }
        h1 {
          color: #1a202c;
          margin: 0 0 10px;
          font-size: 32px;
        }
        .welcome-text {
          font-size: 18px;
          color: #4a5568;
          margin: 20px 0;
        }
        .feature-list {
          background: #f7fafc;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
        }
        .feature-item {
          display: flex;
          align-items: center;
          margin: 12px 0;
          font-size: 16px;
        }
        .feature-emoji {
          font-size: 24px;
          margin-right: 12px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #718096;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎵</div>
          <h1>Bienvenue ${pseudo} !</h1>
        </div>
        
        <p class="welcome-text">
          Félicitations ! Tu fais maintenant partie de la communauté Rezo. 
          Nous sommes ravis de t'accueillir dans cette aventure musicale émotionnelle.
        </p>
        
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-emoji">🎭</span>
            <span>Découvre de la musique selon ton humeur du moment</span>
          </div>
          <div class="feature-item">
            <span class="feature-emoji">💬</span>
            <span>Échange avec d'autres mélomanes dans nos salons</span>
          </div>
          <div class="feature-item">
            <span class="feature-emoji">🎵</span>
            <span>Crée et partage tes playlists personnalisées</span>
          </div>
          <div class="feature-item">
            <span class="feature-emoji">🌟</span>
            <span>Explore de nouveaux genres et artistes</span>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}" class="cta-button">
            Commencer l'exploration 🚀
          </a>
        </div>
        
        <div class="footer">
          <p>Merci de faire partie de Rezo !<br>
          L'équipe Rezo</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Envoie un email avec magic link
 * @param {string} email - Email du destinataire
 * @param {string} magicLink - Lien magique à envoyer
 * @param {string} token - Token pour le mode développement
 * @returns {Promise} - Promesse de l'envoi
 */
const sendMagicLinkEmail = async (email, magicLink, token = null) => {
  try {
    // Priorité 1: SendGrid (recommandé pour l'envoi à n'importe quelle adresse)
    if (process.env.SENDGRID_API_KEY && sendgridSendMagicLink) {
      console.log("📧 Utilisation de SendGrid pour l'envoi");
      return await sendgridSendMagicLink(email, magicLink, token);
    }
    // Priorité 2: Resend (limité à votre propre email)
    else if (process.env.RESEND_API_KEY && resendSendMagicLink) {
      console.log("📧 Utilisation de Resend pour l'envoi");
      return await resendSendMagicLink(email, magicLink, token);
    }
    // Fallback: Nodemailer (SMTP)
    else {
      console.log("📧 Utilisation de Nodemailer pour l'envoi");
      const transporter = createTransporter();

      const mailOptions = {
        from: `"Rezo" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: "🎵 Ton lien de connexion Rezo",
        text: getMagicLinkTextTemplate(magicLink, email),
        html: getMagicLinkEmailTemplate(magicLink, email),
      };

      const result = await transporter.sendMail(mailOptions);
      console.log("Magic link email envoyé:", result.messageId);
      return result;
    }
  } catch (error) {
    console.error("Erreur envoi magic link email:", error);
    throw error;
  }
};

/**
 * Envoie un email de bienvenue
 * @param {string} email - Email du destinataire
 * @param {string} pseudo - Pseudo de l'utilisateur
 * @returns {Promise} - Promesse de l'envoi
 */
const sendWelcomeEmail = async (email, pseudo) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Rezo" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `🎉 Bienvenue sur Rezo, ${pseudo} !`,
      text: `Bienvenue ${pseudo} !\n\nTu fais maintenant partie de la communauté Rezo. Découvre de la musique selon ton humeur et connecte-toi avec d'autres mélomanes.\n\nCommence ton exploration : ${process.env.FRONTEND_URL}\n\nL'équipe Rezo`,
      html: getWelcomeEmailTemplate(pseudo),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Welcome email envoyé:", result.messageId);
    return result;
  } catch (error) {
    console.error("Erreur envoi welcome email:", error);
    throw error;
  }
};

/**
 * Teste la configuration email
 * @returns {Promise<boolean>} - True si la configuration fonctionne
 */
const testEmailConfiguration = async () => {
  try {
    // Priorité 1: Tester SendGrid si configuré
    if (process.env.SENDGRID_API_KEY && testSendGridConfiguration) {
      console.log("🧪 Test configuration SendGrid...");
      return await testSendGridConfiguration();
    }
    // Priorité 2: Tester Resend si configuré
    else if (process.env.RESEND_API_KEY && testResendConfiguration) {
      console.log("🧪 Test configuration Resend...");
      return await testResendConfiguration();
    }
    // Fallback: Tester Nodemailer
    else {
      console.log("🧪 Test configuration Nodemailer...");
      const transporter = createTransporter();
      await transporter.verify();
      console.log("✅ Configuration email valide");
      return true;
    }
  } catch (error) {
    console.error("❌ Configuration email invalide:", error.message);
    return false;
  }
};

module.exports = {
  sendMagicLinkEmail,
  sendWelcomeEmail,
  testEmailConfiguration,
};
