/**
 * Utilitaires de sécurité pour l'API Rezo
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

// Configuration de sécurité
const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "fallback-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  MAGIC_LINK_EXPIRY: parseInt(process.env.MAGIC_LINK_EXPIRY) || 600000, // 10 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
};

// Rate limiting configurations
const rateLimitConfigs = {
  // Limitation générale
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: "Trop de requêtes, réessayez plus tard" },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Limitation pour les magic links
  magicLink: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 magic links per window
    message: {
      error: "Trop de demandes de magic link, réessayez dans 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Limitation pour les tentatives de connexion
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: {
      error: "Trop de tentatives de connexion, réessayez dans 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Limitation pour les requêtes API
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: { error: "Trop de requêtes API, réessayez dans une minute" },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Validation des entrées
const inputValidation = {
  // Validation d'email
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validation de pseudo
  pseudo: (pseudo) => {
    if (!pseudo || typeof pseudo !== "string") return false;
    if (pseudo.length < 2 || pseudo.length > 20) return false;
    if (!/^[a-zA-Z0-9_-]+$/.test(pseudo)) return false;
    return true;
  },

  // Validation de mot de passe (si utilisé)
  password: (password) => {
    if (!password || typeof password !== "string") return false;
    if (password.length < 8) return false;
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return false;
    return true;
  },

  // Validation d'URL
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Validation d'ID MongoDB
  mongoId: (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },
};

// Sanitisation des entrées
const sanitizeInput = {
  // Nettoyer une chaîne de caractères
  string: (str) => {
    if (typeof str !== "string") return "";
    return str.trim().replace(/[<>]/g, "");
  },

  // Nettoyer un email
  email: (email) => {
    if (typeof email !== "string") return "";
    return email.toLowerCase().trim();
  },

  // Nettoyer un pseudo
  pseudo: (pseudo) => {
    if (typeof pseudo !== "string") return "";
    return pseudo.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  },

  // Nettoyer un objet
  object: (obj) => {
    if (typeof obj !== "object" || obj === null) return {};

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeInput.string(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeInput.object(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },
};

// Gestion des sessions et tokens
const sessionManager = {
  // Générer un token sécurisé
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString("hex");
  },

  // Hasher un token
  hashToken: (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
  },

  // Vérifier un token hashé
  verifyToken: (token, hashedToken) => {
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    return hashed === hashedToken;
  },

  // Générer un JWT sécurisé
  generateJWT: (payload) => {
    const jwt = require("jsonwebtoken");
    return jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, {
      expiresIn: SECURITY_CONFIG.JWT_EXPIRES_IN,
      issuer: "rezo-api",
      audience: "rezo-app",
    });
  },

  // Vérifier un JWT
  verifyJWT: (token) => {
    const jwt = require("jsonwebtoken");
    return jwt.verify(token, SECURITY_CONFIG.JWT_SECRET, {
      issuer: "rezo-api",
      audience: "rezo-app",
    });
  },
};

// Gestion des mots de passe (si utilisé)
const passwordManager = {
  // Hasher un mot de passe
  hashPassword: async (password) => {
    return await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
  },

  // Vérifier un mot de passe
  verifyPassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },
};

// Détection d'attaques
const attackDetection = {
  // Détecter les tentatives de brute force
  detectBruteForce: (attempts, timeWindow = 15 * 60 * 1000) => {
    const now = Date.now();
    const recentAttempts = attempts.filter(
      (attempt) => now - attempt.timestamp < timeWindow
    );

    return recentAttempts.length >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
  },

  // Détecter les requêtes suspectes
  detectSuspiciousRequest: (req) => {
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /onload/i,
      /onerror/i,
      /<script/i,
      /eval\(/i,
      /document\.cookie/i,
    ];

    const userAgent = req.get("User-Agent") || "";
    const body = JSON.stringify(req.body) || "";
    const query = JSON.stringify(req.query) || "";

    const allContent = `${userAgent} ${body} ${query}`;

    return suspiciousPatterns.some((pattern) => pattern.test(allContent));
  },

  // Détecter les requêtes de scraping
  detectScraping: (req) => {
    const userAgent = req.get("User-Agent") || "";
    const scrapingPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /requests/i,
    ];

    return scrapingPatterns.some((pattern) => pattern.test(userAgent));
  },
};

// Middleware de sécurité
const securityMiddleware = {
  // Middleware de validation des entrées
  validateInput: (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body);
        if (error) {
          return res.status(400).json({
            error: "Données invalides",
            details: error.details[0].message,
          });
        }
        req.body = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  },

  // Middleware de sanitisation
  sanitizeInput: (req, res, next) => {
    if (req.body) {
      req.body = sanitizeInput.object(req.body);
    }
    if (req.query) {
      req.query = sanitizeInput.object(req.query);
    }
    next();
  },

  // Middleware de détection d'attaques
  detectAttacks: (req, res, next) => {
    if (attackDetection.detectSuspiciousRequest(req)) {
      return res.status(400).json({
        error: "Requête suspecte détectée",
      });
    }

    if (attackDetection.detectScraping(req)) {
      return res.status(403).json({
        error: "Accès non autorisé",
      });
    }

    next();
  },

  // Middleware de logging de sécurité
  securityLogging: (req, res, next) => {
    const securityLog = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
    };

    // Log en cas de requête suspecte
    if (attackDetection.detectSuspiciousRequest(req)) {
      console.warn("🚨 Requête suspecte détectée:", securityLog);
    }

    next();
  },
};

module.exports = {
  SECURITY_CONFIG,
  rateLimitConfigs,
  inputValidation,
  sanitizeInput,
  sessionManager,
  passwordManager,
  attackDetection,
  securityMiddleware,
};
