const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const User = require('../models/User');
const { sendMagicLinkEmail, sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();

// Rate limiting spécifique pour les magic links
const magicLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 tentatives par IP
  message: {
    error: 'Trop de demandes de magic link. Réessayez dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const emailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'Email requis'
  })
});

const verifyTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token requis'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'Email requis'
  }),
  pseudo: Joi.string().min(2).max(20).optional().messages({
    'string.min': 'Le pseudo doit faire au moins 2 caractères',
    'string.max': 'Le pseudo ne peut pas dépasser 20 caractères'
  })
});

// Middleware d'authentification JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token d\'accès requis'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Token invalide'
      });
    }
    req.user = user;
    next();
  });
}

// POST /api/auth/request-magic-link - Demander un magic link
router.post('/request-magic-link', magicLinkLimiter, async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Email invalide',
        details: error.details[0].message
      });
    }

    const { email } = value;

    // Chercher ou créer l'utilisateur
    let user = await User.findOne({ email }).select('+magicLinkToken +magicLinkExpires');
    
    if (!user) {
      user = new User({ 
        email,
        pseudo: `user_${Date.now()}` // Pseudo temporaire
      });
    }

    // Générer le magic link token
    const token = user.generateMagicLinkToken();
    await user.save();

    // Construire le magic link
    const magicLink = `${process.env.FRONTEND_URL}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

    // Envoyer l'email
    await sendMagicLinkEmail(email, magicLink);

    res.json({
      message: 'Magic link envoyé par email',
      email: email
    });

  } catch (error) {
    console.error('Erreur request magic link:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi du magic link'
    });
  }
});

// POST /api/auth/verify-magic-link - Vérifier le magic link
router.post('/verify-magic-link', async (req, res) => {
  try {
    const { error, value } = verifyTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { token, email, pseudo } = value;

    // Trouver l'utilisateur avec le token
    const user = await User.findOne({ email }).select('+magicLinkToken +magicLinkExpires');
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Valider le magic link token
    if (!user.validateMagicLinkToken(token)) {
      return res.status(400).json({
        error: 'Magic link invalide ou expiré'
      });
    }

    // Si c'est un nouvel utilisateur
    const isNewUser = !user.isVerified;
    
    if (isNewUser) {
      // Si pas de pseudo fourni, retourner qu'un pseudo est requis
      if (!pseudo) {
        return res.json({
          message: 'Pseudo requis pour nouveau compte',
          requiresPseudo: true,
          user: {
            id: user._id,
            email: user.email,
            isNewUser: true,
            token: token // Garder le token pour la prochaine étape
          }
        });
      }
      // Sinon, définir le pseudo
      user.pseudo = pseudo;
    }

    // Marquer comme vérifié et nettoyer le token
    user.isVerified = true;
    user.lastLogin = new Date();
    user.loginCount += 1;
    user.clearMagicLinkToken();
    
    await user.save();

    // Envoyer email de bienvenue pour les nouveaux utilisateurs
    if (isNewUser) {
      try {
        await sendWelcomeEmail(email, user.pseudo);
      } catch (emailError) {
        console.error('Erreur envoi welcome email:', emailError);
        // Ne pas faire échouer la connexion si l'email de bienvenue échoue
      }
    }

    // Générer JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        pseudo: user.pseudo
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: isNewUser ? 'Compte créé et connecté' : 'Connexion réussie',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        pseudo: user.pseudo,
        avatar: user.avatar,
        isVerified: user.isVerified,
        preferences: user.preferences,
        isNewUser
      }
    });

  } catch (error) {
    console.error('Erreur verify magic link:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification'
    });
  }
});

// GET /api/auth/me - Obtenir les informations de l'utilisateur connecté
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        pseudo: user.pseudo,
        avatar: user.avatar,
        isVerified: user.isVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });
  } catch (error) {
    console.error('Erreur get me:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// POST /api/auth/logout - Déconnexion (côté client)
router.post('/logout', authenticateToken, (req, res) => {
  // La déconnexion JWT se fait côté client en supprimant le token
  // Ici on peut juste confirmer la déconnexion
  res.json({
    message: 'Déconnexion réussie'
  });
});

module.exports = router;
