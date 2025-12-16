// server/routes/favoriteRoutes.js
import express from "express";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * GET /api/favorites
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    res.json([]);
  } catch (err) {
    console.error("Load favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/favorites/:productId
 */
router.post("/:productId", verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;

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
 */
router.delete("/:productId", verifyToken, async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
