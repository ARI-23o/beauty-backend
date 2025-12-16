// server/routes/favoriteRoutes.js
import express from "express";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * GET /api/favorites
 * Load user favorites
 */
router.get("/favorites", verifyToken, async (req, res) => {
  try {
    // TEMPORARY: return empty array (safe)
    // Later you can connect DB
    res.json([]);
  } catch (err) {
    console.error("Load favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/favorites/:productId
 * Add product to favorites
 */
router.post("/favorites/:productId", verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID required" });
    }

    // TEMPORARY: just confirm success
    res.json({
      success: true,
      productId,
      message: "Added to favorites",
    });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/favorites/:productId
 * Remove favorite (optional but good)
 */
router.delete("/favorites/:productId", verifyToken, async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
