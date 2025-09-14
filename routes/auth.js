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
  try {
    console.log('🔐 [AUTH] Vérification du token JWT...');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔐 [AUTH] Auth header présent:', !!authHeader);
    console.log('🔐 [AUTH] Token extrait:', !!token);

    if (!token) {
      console.log('❌ [AUTH] Aucun token fourni');
      return res.status(401).json({
        error: 'Token d\'accès requis'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('❌ [AUTH] Erreur vérification JWT:', err.message);
        return res.status(403).json({
          error: 'Token invalide'
        });
      }
      console.log('✅ [AUTH] Token JWT valide pour utilisateur:', user.userId);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('❌ [AUTH] Erreur dans authenticateToken:', error);
    return res.status(500).json({
      error: 'Erreur serveur lors de l\'authentification'
    });
  }
}

// POST /api/auth/request-magic-link - Demander un magic link
router.post('/request-magic-link', magicLinkLimiter, async (req, res) => {
  try {
    console.log('📧 [MAGIC-LINK] Demande de magic link reçue');
    console.log('📧 [MAGIC-LINK] Body reçu:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      console.log('❌ [MAGIC-LINK] Validation échouée:', error.details[0].message);
      return res.status(400).json({
        error: 'Email invalide',
        details: error.details[0].message
      });
    }

    const { email } = value;
    console.log('📧 [MAGIC-LINK] Email validé:', email);

    // Chercher ou créer l'utilisateur
    console.log('🔍 [MAGIC-LINK] Recherche utilisateur existant...');
    let user = await User.findOne({ email }).select('+magicLinkToken +magicLinkExpires');
    
    if (!user) {
      console.log('👤 [MAGIC-LINK] Nouvel utilisateur, création...');
      user = new User({ 
        email,
        pseudo: `user_${Date.now()}` // Pseudo temporaire
      });
    } else {
      console.log('👤 [MAGIC-LINK] Utilisateur existant trouvé:', user._id);
    }

    // Générer le magic link token
    console.log('🔑 [MAGIC-LINK] Génération du token...');
    const token = user.generateMagicLinkToken();
    console.log('🔑 [MAGIC-LINK] Token généré, sauvegarde utilisateur...');
    await user.save();
    console.log('✅ [MAGIC-LINK] Utilisateur sauvegardé');

    // Construire le magic link
    const magicLink = `${process.env.FRONTEND_URL}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
    console.log('🔗 [MAGIC-LINK] Magic link construit:', magicLink);

    // Envoyer l'email
    console.log('📤 [MAGIC-LINK] Envoi de l\'email...');
    await sendMagicLinkEmail(email, magicLink);
    console.log('✅ [MAGIC-LINK] Email envoyé avec succès');

    res.json({
      message: 'Magic link envoyé par email',
      email: email
    });

  } catch (error) {
    console.error('❌ [MAGIC-LINK] Erreur complète:', error);
    console.error('❌ [MAGIC-LINK] Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi du magic link',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/verify-magic-link - Vérifier le magic link
router.post('/verify-magic-link', async (req, res) => {
  try {
    console.log('🔐 [VERIFY] Vérification du magic link...');
    console.log('🔐 [VERIFY] Body reçu:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = verifyTokenSchema.validate(req.body);
    if (error) {
      console.log('❌ [VERIFY] Validation échouée:', error.details[0].message);
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { token, email, pseudo } = value;
    console.log('🔐 [VERIFY] Données validées - Email:', email, 'Pseudo:', pseudo, 'Token présent:', !!token);

    // Trouver l'utilisateur avec le token
    console.log('🔍 [VERIFY] Recherche utilisateur...');
    const user = await User.findOne({ email }).select('+magicLinkToken +magicLinkExpires');
    
    if (!user) {
      console.log('❌ [VERIFY] Utilisateur non trouvé pour email:', email);
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }
    
    console.log('👤 [VERIFY] Utilisateur trouvé:', user._id);
    console.log('🔐 [VERIFY] Token stocké présent:', !!user.magicLinkToken);
    console.log('⏰ [VERIFY] Expiration:', user.magicLinkExpires);

    // Valider le magic link token
    console.log('🔑 [VERIFY] Validation du token...');
    const isTokenValid = user.validateMagicLinkToken(token);
    console.log('🔑 [VERIFY] Token valide:', isTokenValid);
    
    if (!isTokenValid) {
      console.log('❌ [VERIFY] Magic link invalide ou expiré');
      return res.status(400).json({
        error: 'Magic link invalide ou expiré'
      });
    }

    // Si c'est un nouvel utilisateur
    const isNewUser = !user.isVerified;
    console.log('👤 [VERIFY] Nouvel utilisateur:', isNewUser);
    
    if (isNewUser) {
      // Si pas de pseudo fourni, retourner qu'un pseudo est requis
      if (!pseudo) {
        console.log('📝 [VERIFY] Pseudo requis pour nouveau compte');
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
      console.log('📝 [VERIFY] Définition du pseudo:', pseudo);
      user.pseudo = pseudo;
    }

    // Marquer comme vérifié et nettoyer le token
    console.log('✅ [VERIFY] Mise à jour des données utilisateur...');
    user.isVerified = true;
    user.lastLogin = new Date();
    user.loginCount += 1;
    user.clearMagicLinkToken();
    
    console.log('💾 [VERIFY] Sauvegarde utilisateur...');
    await user.save();
    console.log('✅ [VERIFY] Utilisateur sauvegardé');

    // Envoyer email de bienvenue pour les nouveaux utilisateurs
    if (isNewUser) {
      try {
        console.log('📧 [VERIFY] Envoi email de bienvenue...');
        await sendWelcomeEmail(email, user.pseudo);
        console.log('✅ [VERIFY] Email de bienvenue envoyé');
      } catch (emailError) {
        console.error('❌ [VERIFY] Erreur envoi welcome email:', emailError);
        // Ne pas faire échouer la connexion si l'email de bienvenue échoue
      }
    }

    // Générer JWT token
    console.log('🔑 [VERIFY] Génération du JWT token...');
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        pseudo: user.pseudo
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('✅ [VERIFY] JWT token généré');

    const response = {
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
    };
    
    console.log('✅ [VERIFY] Réponse envoyée:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('❌ [VERIFY] Erreur complète:', error);
    console.error('❌ [VERIFY] Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erreur lors de la vérification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/auth/me - Obtenir les informations de l'utilisateur connecté
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('👤 [ME] Récupération infos utilisateur:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      console.log('❌ [ME] Utilisateur non trouvé:', req.user.userId);
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    console.log('✅ [ME] Utilisateur trouvé:', user.email);
    
    const response = {
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
    };
    
    console.log('✅ [ME] Réponse envoyée');
    res.json(response);
  } catch (error) {
    console.error('❌ [ME] Erreur complète:', error);
    console.error('❌ [ME] Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
