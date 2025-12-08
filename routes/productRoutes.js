// server/routes/productRoutes.js
import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  uploadImagesMulter,
  uploadImages,
} from "../middleware/uploadImages.js";
import {
  uploadVideoMulter,
  uploadVideo,
} from "../middleware/uploadVideo.js";

const router = express.Router();

/* -----------------------------
      PUBLIC ROUTES
------------------------------ */

// Get all products
router.get("/", getProducts);

// Get single product
router.get("/:id", getProductById);

/* -----------------------------
      UPLOAD ROUTES
------------------------------ */

// Upload up to 5 images
router.post(
  "/upload-images",
  verifyAdmin,
  uploadImagesMulter.array("images", 5),
  uploadImages,
  (req, res) => {
    res.status(201).json({
      success: true,
      images: req.imageUrls,
    });
  }
);

// Upload single video
router.post(
  "/upload-video",
  verifyAdmin,
  uploadVideoMulter.single("video"),
  uploadVideo,
  (req, res) => {
    res.status(201).json({
      success: true,
      video: req.videoUrl,
    });
  }
);

/* -----------------------------
      CRUD ROUTES
------------------------------ */

router.post("/", verifyAdmin, createProduct);
router.put("/:id", verifyAdmin, updateProduct);
router.delete("/:id", verifyAdmin, deleteProduct);

export default router;
