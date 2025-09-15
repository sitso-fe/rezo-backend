const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testEmailConfiguration } = require('./services/emailService');
require('dotenv').config();
const morgan = require("morgan");

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Trop de requêtes, réessayez plus tard",
  },
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://192.168.1.80:3000", // Network access
      "https://mood-music-mtq1hf8kb-sitsos-projects-8029d805.vercel.app", // Vercel deployment
      // Alternative Vercel URL
      /\.vercel\.app$/, // Allow all Vercel preview deployments
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(morgan("combined"));

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

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Rezo Backend API is running",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route non trouvée",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Données invalides",
      details: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "ID invalide",
    });
  }

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Erreur serveur interne"
        : err.message,
  });
});

// Test de la configuration email au démarrage
const startServer = async () => {
  console.log('🔧 Test de la configuration email...');
  const emailConfigValid = await testEmailConfiguration();
  
  if (!emailConfigValid) {
    console.log('⚠️  Configuration email invalide - les magic links ne fonctionneront pas');
    console.log('📧 Variables requises: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM');
  }
  
  // Démarrage du serveur
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📊 Environnement: ${process.env.NODE_ENV}`);
    console.log(`🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`📧 Configuration email: ${emailConfigValid ? '✅ Valide' : '❌ Invalide'}`);
  });
};

startServer().catch(console.error);

module.exports = app;
