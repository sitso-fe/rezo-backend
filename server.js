const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const { testEmailConfiguration } = require("./services/emailService");
const { rateLimitConfigs, securityMiddleware } = require("./utils/security");
const { globalErrorHandler, notFound } = require("./utils/errorHandler");
const {
  monitoringMiddleware,
  monitoringEndpoints,
} = require("./utils/monitoring");
require("dotenv").config();
const morgan = require("morgan");

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.jamendo.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https://api.jamendo.com"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting - Configuration plus stricte
app.use(rateLimitConfigs.general);

// CORS configuration - Plus restrictive en production
const corsOptions = {
  origin: function (origin, callback) {
    // En développement, permettre localhost
    if (process.env.NODE_ENV === "development") {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Non autorisé par CORS"));
      }
    } else {
      // En production, seulement les domaines autorisés
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.PRODUCTION_FRONTEND_URL,
        "https://mood-music-app-phi.vercel.app", // URL Vercel du frontend
      ].filter(Boolean);

      // Permettre les requêtes sans origin (health checks, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS rejeté pour origin: ${origin}`);
        console.log(`✅ Origins autorisés: ${allowedOrigins.join(', ')}`);
        callback(new Error("Non autorisé par CORS"));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Security middleware
app.use(securityMiddleware.sanitizeInput);
app.use(securityMiddleware.detectAttacks);
app.use(securityMiddleware.securityLogging);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(morgan("combined"));

// Monitoring middleware
app.use(monitoringMiddleware.requestLogger);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/rezo-db"
    );
    console.log("✅ MongoDB connecté avec succès");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error.message);
    // Ne pas arrêter le serveur si MongoDB n'est pas disponible
    console.log("⚠️  Le serveur continue sans MongoDB");
  }
};

connectDB();

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "Rezo Backend API",
    version: "1.0.0",
    status: "running",
    message: "Welcome to Rezo Backend API",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));

// Monitoring endpoints
app.get("/api/health", monitoringEndpoints.health);
app.get("/api/metrics", monitoringEndpoints.metrics);
app.get("/api/logs", monitoringEndpoints.logs);

// 404 handler
app.use("*", notFound);

// Error handling middleware
app.use(monitoringMiddleware.errorLogger);
app.use(globalErrorHandler);

// Test de la configuration email au démarrage
const startServer = async () => {
  console.log("🔧 Test de la configuration email...");
  const emailConfigValid = await testEmailConfiguration();

  if (!emailConfigValid) {
    console.log(
      "⚠️  Configuration email invalide - les magic links ne fonctionneront pas"
    );
    console.log(
      "📧 Variables requises: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM"
    );
  }

  // Démarrage du serveur
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📊 Environnement: ${process.env.NODE_ENV}`);
    console.log(
      `🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`
    );
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(
      `📧 Configuration email: ${
        emailConfigValid ? "✅ Valide" : "❌ Invalide"
      }`
    );
  });
};

startServer().catch(console.error);

module.exports = app;
