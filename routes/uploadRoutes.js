// server/routes/uploadRoutes.js
import express from "express";
import productMediaUpload from "../middleware/multerConfig.js";
import { uploadProductMedia } from "../controllers/uploadController.js";

const router = express.Router();

/**
 * POST /api/uploads/product-media
 * multipart form:
 *  - images: up to 5 files
 *  - video: single file
 */
router.post("/product-media", productMediaUpload, uploadProductMedia);

export default router;
