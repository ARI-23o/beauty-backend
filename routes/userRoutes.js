// server/routes/userRoutes.js
import express from "express";
import {
  getAllUsers,
  deleteUser,
  updateUserCart,
  getUserCart,
} from "../controllers/userController.js";

import { verifyAdmin } from "../middleware/verifyAdmin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// ✅ Admin: Get all users
router.get("/", verifyAdmin, getAllUsers);

// ✅ Admin: Delete user
router.delete("/:id", verifyAdmin, deleteUser);

// ✅ ✅ User: Save cart to DB
router.put("/:id/cart", verifyToken, updateUserCart);
// ✅ ✅ User: Load cart from DB (on login)
router.get("/:id/cart", verifyToken, getUserCart);

export default router;
