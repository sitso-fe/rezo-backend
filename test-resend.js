/**
 * Script de test pour vérifier la configuration Resend
 */
require("dotenv").config();
const { Resend } = require("resend");

async function testResendConfig() {
  console.log("🧪 Test de la configuration Resend...");

  // Vérifier la clé API
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY non trouvée dans .env");
    return;
  }

  console.log(
    "✅ Clé API trouvée:",
    process.env.RESEND_API_KEY.substring(0, 10) + "..."
  );

  // Initialiser Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Test d'envoi d'email
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Rezo <onboarding@resend.dev>",
      to: ["iamsannin06@gmail.com"], // Votre email
      subject: "🎵 Test Magic Link Rezo",
      html: `
        <h1>🎵 Rezo - Test Magic Link</h1>
        <p>Votre configuration Resend fonctionne parfaitement !</p>
        <p>Vous pouvez maintenant utiliser les magic links.</p>
        <p><strong>Token de test:</strong> test-token-123</p>
        <p><strong>Lien de test:</strong> http://localhost:3000/auth?token=test-token-123</p>
      `,
    });

    console.log("✅ Email de test envoyé avec succès!");
    console.log("📧 ID de l'email:", result.data?.id);
    console.log("📧 Vérifiez votre boîte email: iamsannin06@gmail.com");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi:", error);
  }
}

testResendConfig();
