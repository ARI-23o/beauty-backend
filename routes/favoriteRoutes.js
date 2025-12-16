// server/routes/favoriteRoutes.js
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * GET /api/favorites
 * Temporary safe route to avoid 404
 */
router.get("/favorites", verifyToken, async (req, res) => {
  try {
    // Later you can fetch from DB
    res.json([]);
  } catch (err) {
    console.error("Favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
