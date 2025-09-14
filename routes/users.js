const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

const router = express.Router();

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

// Validation schemas
const updateProfileSchema = Joi.object({
  pseudo: Joi.string().min(2).max(20).optional(),
  avatar: Joi.string().uri().optional(),
  preferences: Joi.object({
    preferredGenres: Joi.array().items(
      Joi.string().valid('pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'r&b', 'indie', 'folk', 'reggae')
    ).optional(),
    onboardingCompleted: Joi.boolean().optional()
  }).optional()
});

const moodSchema = Joi.object({
  mood: Joi.string().required()
});

// GET /api/users/profile - Obtenir le profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
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
        joinedAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur get profile:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// PUT /api/users/profile - Mettre à jour le profil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les champs fournis
    if (value.pseudo) user.pseudo = value.pseudo;
    if (value.avatar) user.avatar = value.avatar;
    if (value.preferences) {
      user.preferences = { ...user.preferences, ...value.preferences };
    }

    await user.save();

    res.json({
      message: 'Profil mis à jour',
      user: {
        id: user._id,
        email: user.email,
        pseudo: user.pseudo,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Erreur update profile:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour'
    });
  }
});

// POST /api/users/mood - Enregistrer une humeur
router.post('/mood', authenticateToken, async (req, res) => {
  try {
    const { error, value } = moodSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Ajouter l'humeur à l'historique
    user.preferences.moodHistory.push({
      mood: value.mood,
      timestamp: new Date()
    });

    // Garder seulement les 50 dernières humeurs
    if (user.preferences.moodHistory.length > 50) {
      user.preferences.moodHistory = user.preferences.moodHistory.slice(-50);
    }

    await user.save();

    res.json({
      message: 'Humeur enregistrée',
      mood: value.mood,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erreur save mood:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement'
    });
  }
});

// GET /api/users/mood-history - Obtenir l'historique des humeurs
router.get('/mood-history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      moodHistory: user.preferences.moodHistory || []
    });
  } catch (error) {
    console.error('Erreur get mood history:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// DELETE /api/users/account - Supprimer le compte
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    await User.findByIdAndDelete(req.user.userId);

    res.json({
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur delete account:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;
