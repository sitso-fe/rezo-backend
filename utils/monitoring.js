/**
 * Système de monitoring et logging pour l'API Rezo
 */

const fs = require("fs").promises;
const path = require("path");

// Configuration du monitoring
const MONITORING_CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_FILE: process.env.LOG_FILE || "logs/app.log",
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 5,
  METRICS_INTERVAL: 60000, // 1 minute
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
};

// Niveaux de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Métriques de l'application
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byMethod: {},
    byRoute: {},
    byStatus: {},
  },
  performance: {
    responseTime: [],
    memoryUsage: [],
    cpuUsage: [],
  },
  errors: {
    total: 0,
    byType: {},
    byRoute: {},
  },
  users: {
    active: 0,
    total: 0,
    newToday: 0,
  },
  system: {
    uptime: Date.now(),
    lastHealthCheck: Date.now(),
    status: "healthy",
  },
};

// Logger personnalisé
class Logger {
  constructor() {
    this.logLevel =
      LOG_LEVELS[MONITORING_CONFIG.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO;
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    const logDir = path.dirname(MONITORING_CONFIG.LOG_FILE);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error("Erreur création répertoire logs:", error);
    }
  }

  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta,
      pid: process.pid,
      hostname: require("os").hostname(),
    };

    return JSON.stringify(logEntry);
  }

  async writeLog(logEntry) {
    try {
      await fs.appendFile(MONITORING_CONFIG.LOG_FILE, logEntry + "\n");
    } catch (error) {
      console.error("Erreur écriture log:", error);
    }
  }

  log(level, message, meta = {}) {
    if (LOG_LEVELS[level] <= this.logLevel) {
      const logEntry = this.formatLog(level, message, meta);

      // Console en développement
      if (process.env.NODE_ENV === "development") {
        console.log(logEntry);
      }

      // Fichier en production
      if (process.env.NODE_ENV === "production") {
        this.writeLog(logEntry);
      }
    }
  }

  error(message, meta = {}) {
    this.log("ERROR", message, meta);
  }

  warn(message, meta = {}) {
    this.log("WARN", message, meta);
  }

  info(message, meta = {}) {
    this.log("INFO", message, meta);
  }

  debug(message, meta = {}) {
    this.log("DEBUG", message, meta);
  }
}

// Instance du logger
const logger = new Logger();

// Collecteur de métriques
class MetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.startMetricsCollection();
  }

  // Enregistrer une requête
  recordRequest(req, res, responseTime) {
    metrics.requests.total++;

    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }

    // Métriques par méthode
    const method = req.method;
    metrics.requests.byMethod[method] =
      (metrics.requests.byMethod[method] || 0) + 1;

    // Métriques par route
    const route = req.route?.path || req.path;
    metrics.requests.byRoute[route] =
      (metrics.requests.byRoute[route] || 0) + 1;

    // Métriques par statut
    const status = res.statusCode;
    metrics.requests.byStatus[status] =
      (metrics.requests.byStatus[status] || 0) + 1;

    // Temps de réponse
    metrics.performance.responseTime.push(responseTime);
    if (metrics.performance.responseTime.length > 1000) {
      metrics.performance.responseTime =
        metrics.performance.responseTime.slice(-1000);
    }
  }

  // Enregistrer une erreur
  recordError(error, req) {
    metrics.errors.total++;

    const errorType = error.name || "UnknownError";
    metrics.errors.byType[errorType] =
      (metrics.errors.byType[errorType] || 0) + 1;

    const route = req.route?.path || req.path;
    metrics.errors.byRoute[route] = (metrics.errors.byRoute[route] || 0) + 1;
  }

  // Obtenir les métriques
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    return {
      ...metrics,
      system: {
        ...metrics.system,
        uptime,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
        },
        cpuUsage: process.cpuUsage(),
      },
    };
  }

  // Démarrer la collecte de métriques système
  startMetricsCollection() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      metrics.performance.memoryUsage.push({
        timestamp: Date.now(),
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
      });

      if (metrics.performance.memoryUsage.length > 100) {
        metrics.performance.memoryUsage =
          metrics.performance.memoryUsage.slice(-100);
      }
    }, MONITORING_CONFIG.METRICS_INTERVAL);
  }
}

// Instance du collecteur de métriques
const metricsCollector = new MetricsCollector();

// Middleware de monitoring
const monitoringMiddleware = {
  // Middleware de logging des requêtes
  requestLogger: (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const responseTime = Date.now() - startTime;

      // Enregistrer la requête
      metricsCollector.recordRequest(req, res, responseTime);

      // Logger la requête
      logger.info("Request completed", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });
    });

    next();
  },

  // Middleware de gestion des erreurs
  errorLogger: (err, req, res, next) => {
    // Enregistrer l'erreur
    metricsCollector.recordError(err, req);

    // Logger l'erreur
    logger.error("Request error", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });

    next(err);
  },
};

// Vérification de santé
const healthCheck = {
  // Vérifier la santé de l'application
  checkHealth: async () => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Date.now() - metrics.system.uptime,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {},
    };

    // Vérifier MongoDB
    try {
      const mongoose = require("mongoose");
      health.checks.mongodb = {
        status: mongoose.connection.readyState === 1 ? "healthy" : "unhealthy",
        readyState: mongoose.connection.readyState,
      };
    } catch (error) {
      health.checks.mongodb = {
        status: "unhealthy",
        error: error.message,
      };
    }

    // Vérifier la mémoire
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    health.checks.memory = {
      status: memoryUsageMB < 500 ? "healthy" : "warning",
      usage: `${memoryUsageMB.toFixed(2)}MB`,
    };

    // Vérifier les métriques
    const currentMetrics = metricsCollector.getMetrics();
    const errorRate =
      currentMetrics.requests.total > 0
        ? (currentMetrics.requests.failed / currentMetrics.requests.total) * 100
        : 0;

    health.checks.errorRate = {
      status: errorRate < 5 ? "healthy" : "warning",
      rate: `${errorRate.toFixed(2)}%`,
    };

    // Déterminer le statut global
    const checks = Object.values(health.checks);
    if (checks.some((check) => check.status === "unhealthy")) {
      health.status = "unhealthy";
    } else if (checks.some((check) => check.status === "warning")) {
      health.status = "warning";
    }

    metrics.system.lastHealthCheck = Date.now();
    metrics.system.status = health.status;

    return health;
  },
};

// Endpoints de monitoring
const monitoringEndpoints = {
  // Endpoint de santé
  health: async (req, res) => {
    try {
      const health = await healthCheck.checkHealth();
      const statusCode = health.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error("Health check failed", { error: error.message });
      res.status(503).json({
        status: "unhealthy",
        error: "Health check failed",
      });
    }
  },

  // Endpoint de métriques
  metrics: (req, res) => {
    try {
      const currentMetrics = metricsCollector.getMetrics();
      res.json(currentMetrics);
    } catch (error) {
      logger.error("Metrics retrieval failed", { error: error.message });
      res.status(500).json({ error: "Failed to retrieve metrics" });
    }
  },

  // Endpoint de logs
  logs: async (req, res) => {
    try {
      const { level, limit = 100 } = req.query;
      const logFile = MONITORING_CONFIG.LOG_FILE;

      if (process.env.NODE_ENV === "production") {
        const logContent = await fs.readFile(logFile, "utf8");
        const logs = logContent
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return { message: line };
            }
          })
          .filter((log) => !level || log.level === level)
          .slice(-limit);

        res.json({ logs });
      } else {
        res.json({ message: "Logs not available in development mode" });
      }
    } catch (error) {
      logger.error("Log retrieval failed", { error: error.message });
      res.status(500).json({ error: "Failed to retrieve logs" });
    }
  },
};

module.exports = {
  logger,
  metricsCollector,
  monitoringMiddleware,
  healthCheck,
  monitoringEndpoints,
  MONITORING_CONFIG,
};
