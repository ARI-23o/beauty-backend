// server/routes/trackingRoutes.js
import express from "express";
import {
  createTrackingForOrder,
  getTrackingForOrder,
  updateTrackingStatus,
  pollTrackingNow,
} from "../controllers/trackingController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// Public for logged in user to view tracking
router.get("/order/:orderId", verifyToken, getTrackingForOrder);

// Admin: create tracking for order (body: { courier, auto, useAftership })
router.post("/:orderId/create", verifyAdmin, createTrackingForOrder);

// Admin: manual update
router.patch("/:trackingId/status", verifyAdmin, updateTrackingStatus);

// Admin: poll now
router.post("/:trackingId/poll", verifyAdmin, pollTrackingNow);

export default router;
