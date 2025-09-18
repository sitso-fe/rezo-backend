const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const mongoose = require("mongoose");

describe("Auth Routes", () => {
  beforeAll(async () => {
    // Connecter à la base de données de test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/rezo-test"
      );
    }
  });

  afterAll(async () => {
    // Nettoyer et fermer la connexion
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await User.deleteMany({});
  });

  describe("POST /api/auth/request-magic-link", () => {
    it("devrait envoyer un magic link pour un nouvel utilisateur", async () => {
      const response = await request(app)
        .post("/api/auth/request-magic-link")
        .send({ email: "test@example.com" })
        .expect(200);

      expect(response.body.message).toBe("Magic link envoyé avec succès");
      expect(response.body.email).toBe("test@example.com");
    });

    it("devrait rejeter un email invalide", async () => {
      const response = await request(app)
        .post("/api/auth/request-magic-link")
        .send({ email: "email-invalide" })
        .expect(400);

      expect(response.body.error).toBe("Email invalide");
    });

    it("devrait rejeter une requête sans email", async () => {
      const response = await request(app)
        .post("/api/auth/request-magic-link")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Email invalide");
    });
  });

  describe("POST /api/auth/verify-magic-link", () => {
    let testUser;
    let magicLinkToken;

    beforeEach(async () => {
      // Créer un utilisateur de test avec un magic link
      testUser = new User({
        email: "test@example.com",
        pseudo: "user_1234567890",
      });
      magicLinkToken = testUser.generateMagicLinkToken();
      await testUser.save();
    });

    it("devrait vérifier un magic link valide", async () => {
      const response = await request(app)
        .post("/api/auth/verify-magic-link")
        .send({
          token: magicLinkToken,
          email: "test@example.com",
          pseudo: "testuser",
        })
        .expect(200);

      expect(response.body.message).toBe("Compte créé et connecté");
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.user.pseudo).toBe("testuser");
    });

    it("devrait rejeter un magic link expiré", async () => {
      // Modifier la date d'expiration pour qu'elle soit dans le passé
      testUser.magicLinkExpires = new Date(Date.now() - 1000);
      await testUser.save();

      const response = await request(app)
        .post("/api/auth/verify-magic-link")
        .send({
          token: magicLinkToken,
          email: "test@example.com",
          pseudo: "testuser",
        })
        .expect(400);

      expect(response.body.error).toBe("Magic link invalide ou expiré");
    });

    it("devrait rejeter un token invalide", async () => {
      const response = await request(app)
        .post("/api/auth/verify-magic-link")
        .send({
          token: "token-invalide",
          email: "test@example.com",
          pseudo: "testuser",
        })
        .expect(400);

      expect(response.body.error).toBe("Magic link invalide ou expiré");
    });
  });

  describe("GET /api/auth/me", () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      // Créer un utilisateur de test
      testUser = new User({
        email: "test@example.com",
        pseudo: "testuser",
        isVerified: true,
      });
      await testUser.save();

      // Générer un token JWT
      const jwt = require("jsonwebtoken");
      authToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          pseudo: testUser.pseudo,
        },
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("devrait retourner les informations utilisateur avec un token valide", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.user.pseudo).toBe("testuser");
    });

    it("devrait rejeter une requête sans token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.error).toBe("Token d'accès requis");
    });

    it("devrait rejeter un token invalide", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer token-invalide")
        .expect(403);

      expect(response.body.error).toBe("Token invalide");
    });
  });
});
