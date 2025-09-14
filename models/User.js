const mongoose = require('mongoose');
const crypto = require('crypto');
const { containsPersonalInfo, containsToxicContent } = require('../utils/contentModeration');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  pseudo: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20,
    validate: {
      validator: function(pseudo) {
        return !containsPersonalInfo(pseudo) && !containsToxicContent(pseudo);
      },
      message: 'Le pseudo ne doit pas contenir d\'informations personnelles ou de contenu inapproprié'
    }
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  preferences: {
    preferredGenres: [{
      type: String,
      enum: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'r&b', 'indie', 'folk', 'reggae']
    }],
    moodHistory: [{
      mood: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    onboardingCompleted: {
      type: Boolean,
      default: false
    }
  },
  magicLinkToken: {
    type: String,
    select: false // Ne pas inclure dans les requêtes par défaut
  },
  magicLinkExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
userSchema.index({ magicLinkToken: 1 });
userSchema.index({ magicLinkExpires: 1 });

// Méthode pour générer un magic link token
userSchema.methods.generateMagicLinkToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + parseInt(process.env.MAGIC_LINK_EXPIRY || 600000)); // 10 minutes par défaut
  
  this.magicLinkToken = crypto.createHash('sha256').update(token).digest('hex');
  this.magicLinkExpires = expiry;
  
  return token; // Retourne le token non hashé pour l'email
};

// Méthode pour valider un magic link token
userSchema.methods.validateMagicLinkToken = function(token) {
  if (!this.magicLinkToken || !this.magicLinkExpires) {
    return false;
  }
  
  if (this.magicLinkExpires < new Date()) {
    return false;
  }
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return hashedToken === this.magicLinkToken;
};

// Méthode pour nettoyer le magic link token après utilisation
userSchema.methods.clearMagicLinkToken = function() {
  this.magicLinkToken = undefined;
  this.magicLinkExpires = undefined;
};

// Middleware pre-save pour la validation
userSchema.pre('save', function(next) {
  if (this.isModified('pseudo')) {
    if (containsPersonalInfo(this.pseudo) || containsToxicContent(this.pseudo)) {
      return next(new Error('Le pseudo ne doit pas contenir d\'informations personnelles ou de contenu inapproprié'));
    }
  }
  next();
});

// Méthode statique pour nettoyer les tokens expirés
userSchema.statics.cleanExpiredTokens = async function() {
  try {
    const result = await this.updateMany(
      { magicLinkExpires: { $lt: new Date() } },
      { 
        $unset: { 
          magicLinkToken: 1, 
          magicLinkExpires: 1 
        } 
      }
    );
    console.log(`Nettoyage: ${result.modifiedCount} tokens expirés supprimés`);
    return result;
  } catch (error) {
    console.error('Erreur lors du nettoyage des tokens:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);
