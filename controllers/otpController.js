// server/controllers/otpController.js
import OTP from "../models/OTP.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { sendEmailWithOTP } from "../utils/sendEmail.js";
import { sendSMSWithOTP } from "../utils/sendSMS.js";
import jwt from "jsonwebtoken";

dotenv.config();

const OTP_EXPIRY_MINUTES = 5; // OTP valid for 5 minutes
const OTP_LENGTH = 6;

function generateNumericOtp(length = OTP_LENGTH) {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

/**
 * @desc Request Signup OTP (send to email + mobile)
 * @route POST /api/auth/signup/request-otp
 * @body { name, email, mobile, password }
 */
export const requestSignupOtp = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Basic validation
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ message: "All fields (name, email, mobile, password) are required." });
    }

    // email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    // mobile format: 10 digits
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits." });
    }

    // password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    // Check duplicates in User collection
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(409).json({
        message: existingUser.email === email ? "Email already registered" : "Mobile number already registered",
      });
    }

    // Hash the password and store temporarily in OTP doc
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateNumericOtp(OTP_LENGTH);

    // expiry
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Remove any previous OTPs for same email/mobile to avoid collision
    await OTP.deleteMany({ $or: [{ email }, { mobile }] });

    // Save OTP document
    const otpDoc = new OTP({
      name,
      email,
      mobile,
      otp,
      hashedPassword,
      expiresAt,
    });

    await otpDoc.save();

    // Send OTP via email (best-effort)
    let emailInfo = null;
    try {
      emailInfo = await sendEmailWithOTP(email, name, otp, OTP_EXPIRY_MINUTES);
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    // Send OTP via SMS (best-effort)
    let smsInfo = null;
    try {
      smsInfo = await sendSMSWithOTP(mobile, otp);
    } catch (err) {
      console.error("SMS sending failed:", err);
    }

    // Respond with generic success message (do not leak OTP)
    res.status(200).json({
      message: "OTP sent to provided email and mobile (if configured). OTP is valid for " + OTP_EXPIRY_MINUTES + " minutes.",
      emailSent: !!emailInfo,
      smsSent: !!smsInfo,
    });
  } catch (error) {
    console.error("requestSignupOtp Error:", error);
    res.status(500).json({ message: "Server error while requesting OTP" });
  }
};

/**
 * @desc Verify Signup OTP and create user
 * @route POST /api/auth/signup/verify-otp
 * @body { email OR mobile, otp }
 *
 * Note: we stored hashedPassword in OTP doc previously so we can finalize user creation here.
 */
export const verifySignupOtp = async (req, res) => {
  try {
    let { email, mobile, otp } = req.body;

    if ((!email && !mobile) || !otp) {
      return res.status(400).json({ message: "Provide email or mobile, and otp." });
    }

    // Normalize
    if (email) email = email.toLowerCase();

    // Find OTP doc by email or mobile and matching OTP string
    const query = email ? { email, otp } : { mobile, otp };
    const otpDoc = await OTP.findOne(query);

    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid OTP or details. Please request a new OTP." });
    }

    // Check expiry
    if (otpDoc.expiresAt < new Date()) {
      // cleanup
      await OTP.deleteMany({ $or: [{ email: otpDoc.email }, { mobile: otpDoc.mobile }] });
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    // Before creating user, ensure user wasn't created by another parallel request
    const existingUser = await User.findOne({ $or: [{ email: otpDoc.email }, { mobile: otpDoc.mobile }] });
    if (existingUser) {
      // cleanup OTPs
      await OTP.deleteMany({ $or: [{ email: otpDoc.email }, { mobile: otpDoc.mobile }] });
      return res.status(409).json({ message: "Email or mobile already registered." });
    }

    // Create user with data from otpDoc
    const newUser = new User({
      name: otpDoc.name,
      email: otpDoc.email,
      mobile: otpDoc.mobile,
      password: otpDoc.hashedPassword, // already hashed
    });

    await newUser.save();

    // Remove OTP documents for this user
    await OTP.deleteMany({ $or: [{ email: otpDoc.email }, { mobile: otpDoc.mobile }] });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        mobile: newUser.mobile,
        name: newUser.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Success response
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
      },
    });
  } catch (error) {
    console.error("verifySignupOtp Error:", error);
    res.status(500).json({ message: "Server error while verifying OTP" });
  }
};
