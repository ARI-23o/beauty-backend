import express from "express";
import {
  login,
  getProfile,
  requestOTP,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// Signup OTP flow
router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// Login
router.post("/login", login);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protected
router.get("/profile", verifyToken, getProfile);

export default router;
