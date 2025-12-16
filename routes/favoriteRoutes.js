// server/routes/favoriteRoutes.js
import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.js";

const router = express.Router();

/**
 * GET /api/favorites
 */
router.get("/", verifyToken, getFavorites);

/**
 * POST /api/favorites/:productId
 */
router.post("/:productId", verifyToken, addFavorite);

/**
 * DELETE /api/favorites/:productId
 */
router.delete("/:productId", verifyToken, removeFavorite);

export default router;
