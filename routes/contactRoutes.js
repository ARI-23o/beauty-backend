// server/routes/contactRoutes.js
import express from "express";
import { createContactMessage } from "../controllers/contactController.js";

const router = express.Router();

/**
 * Public contact endpoint
 * POST /api/contact
 *
 * Expects body:
 * {
 *   name: string,
 *   email: string,
 *   phone?: string,
 *   subject?: string,
 *   message: string
 * }
 *
 * Logic is implemented in createContactMessage controller:
 *  - Validate input
 *  - Save ContactMessage in MongoDB
 *  - Send confirmation email to user
 *  - Send notification email to admin
 */
router.post("/contact", createContactMessage);

export default router;
