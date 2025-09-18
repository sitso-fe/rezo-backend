/**
 * Gestionnaire d'erreurs centralisé pour l'API Rezo
 */

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

// Types d'erreurs prédéfinies
const errorTypes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  CONFLICT_ERROR: "CONFLICT_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EMAIL_ERROR: "EMAIL_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// Créateurs d'erreurs spécialisées
const createError = {
  validation: (message, details = null) =>
    new AppError(message, 400, true, errorTypes.VALIDATION_ERROR, details),

  authentication: (message = "Token d'accès requis") =>
    new AppError(message, 401, true, errorTypes.AUTHENTICATION_ERROR),

  authorization: (message = "Accès non autorisé") =>
    new AppError(message, 403, true, errorTypes.AUTHORIZATION_ERROR),

  notFound: (message = "Ressource non trouvée") =>
    new AppError(message, 404, true, errorTypes.NOT_FOUND_ERROR),

  conflict: (message = "Conflit de ressources") =>
    new AppError(message, 409, true, errorTypes.CONFLICT_ERROR),

  rateLimit: (message = "Trop de requêtes, réessayez plus tard") =>
    new AppError(message, 429, true, errorTypes.RATE_LIMIT_ERROR),

  externalAPI: (message, service = "API externe") =>
    new AppError(
      `${service}: ${message}`,
      502,
      true,
      errorTypes.EXTERNAL_API_ERROR
    ),

  database: (message = "Erreur de base de données") =>
    new AppError(message, 500, true, errorTypes.DATABASE_ERROR),

  email: (message = "Erreur d'envoi d'email") =>
    new AppError(message, 500, true, errorTypes.EMAIL_ERROR),

  internal: (message = "Erreur serveur interne") =>
    new AppError(message, 500, false, errorTypes.INTERNAL_ERROR),
};

// Gestionnaire d'erreurs Mongoose
const handleMongooseError = (error) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return createError.validation("Données invalides", errors);
  }

  if (error.name === "CastError") {
    return createError.validation("ID invalide");
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return createError.conflict(`${field} déjà utilisé`);
  }

  return createError.database("Erreur de base de données");
};

// Gestionnaire d'erreurs JWT
const handleJWTError = () => createError.authentication("Token invalide");

const handleJWTExpiredError = () => createError.authentication("Token expiré");

// Gestionnaire d'erreurs principal
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  console.error("🚨 Erreur:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Erreurs Mongoose
  if (
    err.name === "ValidationError" ||
    err.name === "CastError" ||
    err.code === 11000
  ) {
    error = handleMongooseError(err);
  }

  // Erreurs JWT
  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }

  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  // Erreurs personnalisées
  if (err instanceof AppError) {
    error = err;
  }

  // Réponse d'erreur
  const response = {
    error: error.message,
    status: error.status,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error.details,
    }),
  };

  // Ajouter des headers de retry pour les erreurs de rate limiting
  if (error.statusCode === 429) {
    res.set("Retry-After", "900"); // 15 minutes
  }

  res.status(error.statusCode || 500).json(response);
};

// Middleware pour capturer les erreurs async
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Middleware pour les routes non trouvées
const notFound = (req, res, next) => {
  const error = createError.notFound(`Route ${req.originalUrl} non trouvée`);
  next(error);
};

module.exports = {
  AppError,
  createError,
  globalErrorHandler,
  catchAsync,
  notFound,
  errorTypes,
};
