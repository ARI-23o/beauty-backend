// server/routes/ratingRoutes.js
import express from "express";
import {
  validateRatingToken,
  submitOrderRating,
  getProductRatings,
} from "../controllers/ratingController.js";

const router = express.Router();

// Validate token and return order product list
router.get("/validate/:token", validateRatingToken);

// Submit combined order rating
router.post("/submit", submitOrderRating);

// Get product ratings
router.get("/product/:productId", getProductRatings);

export default router;
