// server/routes/adminRoutes.js
import express from "express";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { adminLogin, verifyAdminToken } from "../controllers/adminController.js";

const router = express.Router();

// ✅ Admin Login
router.post("/login", adminLogin);

// ✅ Verify Admin Token
router.get("/verify", verifyAdmin, verifyAdminToken);

export default router;
