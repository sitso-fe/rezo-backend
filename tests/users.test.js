const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const mongoose = require("mongoose");

describe("User Routes", () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/rezo-test"
      );
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});

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
      { userId: testUser._id, email: testUser.email, pseudo: testUser.pseudo },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  describe("GET /api/users/profile", () => {
    it("devrait retourner le profil utilisateur", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.user.pseudo).toBe("testuser");
    });

    it("devrait rejeter une requête non authentifiée", async () => {
      await request(app).get("/api/users/profile").expect(401);
    });
  });

  describe("PUT /api/users/profile", () => {
    it("devrait mettre à jour le profil utilisateur", async () => {
      const updateData = {
        pseudo: "nouveau_pseudo",
        avatar: "nouvel_avatar.jpg",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.user.pseudo).toBe("nouveau_pseudo");
      expect(response.body.user.avatar).toBe("nouvel_avatar.jpg");
    });

    it("devrait rejeter un pseudo invalide", async () => {
      const updateData = {
        pseudo: "a", // Trop court
      };

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("POST /api/users/mood", () => {
    it("devrait enregistrer une humeur", async () => {
      const moodData = {
        mood: "happy",
      };

      const response = await request(app)
        .post("/api/users/mood")
        .set("Authorization", `Bearer ${authToken}`)
        .send(moodData)
        .expect(200);

      expect(response.body.message).toBe("Humeur enregistrée");
      expect(response.body.mood).toBe("happy");
    });

    it("devrait rejeter une humeur invalide", async () => {
      const moodData = {
        mood: "invalid_mood",
      };

      await request(app)
        .post("/api/users/mood")
        .set("Authorization", `Bearer ${authToken}`)
        .send(moodData)
        .expect(400);
    });
  });

  describe("GET /api/users/mood-history", () => {
    it("devrait retourner l'historique des humeurs", async () => {
      // Ajouter quelques humeurs
      testUser.preferences.moodHistory.push(
        { mood: "happy", timestamp: new Date() },
        { mood: "sad", timestamp: new Date() }
      );
      await testUser.save();

      const response = await request(app)
        .get("/api/users/mood-history")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.moodHistory).toHaveLength(2);
      expect(response.body.moodHistory[0].mood).toBe("happy");
    });
  });

  describe("DELETE /api/users/account", () => {
    it("devrait supprimer le compte utilisateur", async () => {
      const response = await request(app)
        .delete("/api/users/account")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe("Compte supprimé avec succès");

      // Vérifier que l'utilisateur a été supprimé
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });
  });
});
