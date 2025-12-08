// server/routes/adminStatsRoutes.js
import express from "express";
import { ordersSummary } from "../controllers/adminStatsController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();
router.get("/orders-summary", verifyAdmin, ordersSummary);
export default router;
