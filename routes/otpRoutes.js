// server/routes/otpRoutes.js
import express from "express";
import { requestSignupOtp, verifySignupOtp } from "../controllers/otpController.js";

const router = express.Router();

/**
 * @route POST /api/otp/request
 * @desc Send OTP to email and mobile for signup
 * @access Public
 */
router.post("/request", requestSignupOtp);

/**
 * @route POST /api/otp/verify
 * @desc Verify entered OTP and create user
 * @access Public
 */
router.post("/verify", verifySignupOtp);

export default router;
