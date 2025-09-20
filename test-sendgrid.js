/**
 * Script de test pour vérifier la configuration SendGrid
 */
require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function testSendGridConfig() {
  console.log('🧪 Test de la configuration SendGrid...');
  
  // Vérifier la clé API
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY non trouvée dans .env');
    return;
  }
  
  console.log('✅ Clé API trouvée:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');
  
  // Initialiser SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  try {
    // Test d'envoi d'email
    const msg = {
      to: 'test@example.com', // Vous pouvez changer cette adresse
      from: process.env.SENDGRID_FROM_EMAIL || 'Rezo <noreply@rezo.app>',
      subject: '🎵 Test Magic Link Rezo - SendGrid',
      html: `
        <h1>🎵 Rezo - Test Magic Link</h1>
        <p>Votre configuration SendGrid fonctionne parfaitement !</p>
        <p>Vous pouvez maintenant envoyer des emails à n'importe quelle adresse.</p>
        <p><strong>Token de test:</strong> test-token-123</p>
        <p><strong>Lien de test:</strong> http://localhost:3000/auth?token=test-token-123</p>
        <p><strong>Provider:</strong> SendGrid</p>
      `,
      text: `
        🎵 Rezo - Test Magic Link
        
        Votre configuration SendGrid fonctionne parfaitement !
        Vous pouvez maintenant envoyer des emails à n'importe quelle adresse.
        
        Token de test: test-token-123
        Lien de test: http://localhost:3000/auth?token=test-token-123
        Provider: SendGrid
      `
    };
    
    const result = await sgMail.send(msg);
    
    console.log('✅ Email de test envoyé avec succès!');
    console.log('📧 Status Code:', result[0].statusCode);
    console.log('📧 Message ID:', result[0].headers['x-message-id']);
    console.log('📧 Vérifiez la boîte email: test@example.com');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error);
    
    if (error.response) {
      console.error('📋 Détails de l\'erreur:');
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.body);
    }
  }
}

testSendGridConfig();

