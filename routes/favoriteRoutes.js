// server/routes/favoriteRoutes.js
import express from "express";
import { getFavorites, addFavorite, removeFavorite } from "../controllers/favoriteController.js";

// Use your existing token verification middleware (adjust path if needed)
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// Get user's favorites (requires auth)
router.get("/", verifyToken, getFavorites);

// Add product to favorites
router.post("/:productId", verifyToken, addFavorite);

// Remove product from favorites
router.delete("/:productId", verifyToken, removeFavorite);

export default router;

