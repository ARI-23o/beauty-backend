import express from "express";
import {
  getFilters,
  updateFilters,
  addCategory,
  removeCategory,
  addBrand,
  removeBrand,
} from "../controllers/filterController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Public - fetch filter settings
router.get("/", getFilters);

// Admin - update full lists
router.put("/", verifyAdmin, updateFilters);

// Admin - add/remove single category/brand
router.post("/add-category", verifyAdmin, addCategory);
router.post("/remove-category", verifyAdmin, removeCategory);

router.post("/add-brand", verifyAdmin, addBrand);
router.post("/remove-brand", verifyAdmin, removeBrand);

export default router;
