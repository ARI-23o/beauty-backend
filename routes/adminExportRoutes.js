// server/routes/adminExportRoutes.js
import express from "express";
import { exportOrders } from "../controllers/exportController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Admin protected export endpoint
// Query: ?format=csv|excel&status=Shipped&courier=Delhivery
router.get("/orders", verifyAdmin, exportOrders);

export default router;
