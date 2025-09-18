const express = require("express");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const router = express.Router();

// Validation schemas
const emailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email invalide",
    "any.required": "Email requis",
  }),
});

const verifyTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Token requis",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Email invalide",
    "any.required": "Email requis",
  }),
  pseudo: Joi.string().min(2).max(30).required().messages({
    "string.min": "Le pseudo doit faire au moins 2 caractères",
    "string.max": "Le pseudo ne peut pas dépasser 30 caractères",
    "any.required": "Pseudo requis",
  }),
});

// POST /api/auth/request-magic-link - Version de développement
router.post("/request-magic-link", async (req, res) => {
  try {
    // Validation des données
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email } = value;

    // En mode développement, simuler l'envoi d'un magic link
    console.log(`🔗 Magic link simulé pour: ${email}`);

    // Générer un token de test (valide 10 minutes)
    const testToken = jwt.sign(
      { email, type: "magic-link" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "10m" }
    );

    res.json({
      message: "Magic link envoyé avec succès",
      email: email,
      // En développement, on retourne le token pour les tests
      testToken: testToken,
    });
  } catch (error) {
    console.error("Erreur lors de la demande de magic link:", error);
    res.status(500).json({
      error: "Erreur lors de l'envoi du magic link",
      details: error.message,
    });
  }
});

// POST /api/auth/verify-magic-link - Version de développement
router.post("/verify-magic-link", async (req, res) => {
  try {
    // Validation des données
    const { error, value } = verifyTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token, email, pseudo } = value;

    // Vérifier le token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");

      if (decoded.email !== email) {
        return res.status(400).json({ error: "Token invalide pour cet email" });
      }

      // Générer un token JWT pour l'utilisateur
      const userToken = jwt.sign(
        {
          userId: `dev-user-${Date.now()}`,
          email: email,
          pseudo: pseudo,
        },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: "7d" }
      );

      // Simuler la création d'un utilisateur
      const user = {
        id: `dev-user-${Date.now()}`,
        email: email,
        pseudo: pseudo,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };

      res.json({
        message: "Compte créé et connecté",
        token: userToken,
        user: user,
      });
    } catch (jwtError) {
      return res.status(400).json({ error: "Magic link invalide ou expiré" });
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du magic link:", error);
    res.status(500).json({
      error: "Erreur lors de la vérification du magic link",
      details: error.message,
    });
  }
});

// GET /api/auth/me - Version de développement
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token d'accès requis" });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");

      // Simuler les données utilisateur
      const user = {
        id: decoded.userId,
        email: decoded.email,
        pseudo: decoded.pseudo,
        isVerified: true,
        avatar: null,
        preferences: {
          moodHistory: [],
          favoriteGenres: [],
        },
      };

      res.json({ user });
    } catch (jwtError) {
      return res.status(403).json({ error: "Token invalide" });
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération du profil",
      details: error.message,
    });
  }
});

module.exports = router;
