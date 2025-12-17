import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.js";

const router = express.Router();

// 🔐 PROTECT ALL FAVORITES ROUTES
router.use(verifyToken);

router.get("/", getFavorites);
router.post("/:productId", addFavorite);
router.delete("/:productId", removeFavorite);

export default router;
