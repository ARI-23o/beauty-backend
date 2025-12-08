import User from "../models/User.js";
import OTP from "../models/OTP.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";
import twilio from "twilio";

dotenv.config();

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

/* =====================================================
   🟢 REQUEST OTP (SIGNUP)
===================================================== */
export const requestOTP = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !mobile || !password)
      return res.status(400).json({ message: "All fields are required" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format" });
    if (!/^\d{10}$/.test(mobile))
      return res.status(400).json({ message: "Mobile must be 10 digits" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing)
      return res.status(409).json({ message: "Email or mobile already registered" });

    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const mobileOTP = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedEmailOTP = await bcrypt.hash(emailOTP, 10);
    const hashedMobileOTP = await bcrypt.hash(mobileOTP, 10);
    const hashedPassword = await bcrypt.hash(password, 10);

    await OTP.findOneAndUpdate(
      { email },
      {
        email,
        mobile,
        hashedEmailOTP,
        hashedMobileOTP,
        name,
        password: hashedPassword,
        expiresAt: Date.now() + 5 * 60 * 1000,
        lastSentAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    await sendEmail({
      to: email,
      subject: "BeautyE Email OTP",
      html: `<p>Your OTP is <strong>${emailOTP}</strong>. Expires in 5 minutes.</p>`,
    });

    await twilioClient.messages.create({
      body: `Your BeautyE mobile OTP is ${mobileOTP}. Expires in 5 minutes.`,
      from: process.env.TWILIO_FROM,
      to: `+91${mobile}`,
    });

    res.status(200).json({ message: "OTP sent to email and mobile." });
  } catch (error) {
    res.status(500).json({ message: "Server error while requesting OTP" });
  }
};

/* =====================================================
   🟢 VERIFY OTP
===================================================== */
export const verifyOTP = async (req, res) => {
  try {
    const { email, emailOTP, mobileOTP } = req.body;
    if (!email || !emailOTP || !mobileOTP)
      return res.status(400).json({ message: "Email and both OTPs required" });

    const record = await OTP.findOne({ email });
    if (!record) return res.status(404).json({ message: "No OTP record found" });
    if (record.expiresAt < Date.now()) {
      await OTP.deleteOne({ email });
      return res.status(410).json({ message: "OTP expired, please request again" });
    }

    const isEmailValid = await bcrypt.compare(emailOTP, record.hashedEmailOTP);
    const isMobileValid = await bcrypt.compare(mobileOTP, record.hashedMobileOTP);
    if (!isEmailValid || !isMobileValid)
      return res.status(401).json({ message: "Invalid OTP(s)" });

    const newUser = new User({
      name: record.name,
      email: record.email,
      mobile: record.mobile,
      password: record.password,
    });
    await newUser.save();
    await OTP.deleteOne({ email });

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

    res.status(201).json({
      message: "Signup completed successfully",
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, mobile: newUser.mobile },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during OTP verification" });
  }
};

/* =====================================================
   🟢 RESEND OTP
===================================================== */
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const record = await OTP.findOne({ email });
    if (!record) return res.status(404).json({ message: "No OTP request found" });

    const lastSent = record.lastSentAt || 0;
    if (Date.now() - lastSent < 60 * 1000)
      return res.status(429).json({ message: "Please wait before resending OTP" });

    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const mobileOTP = Math.floor(100000 + Math.random() * 900000).toString();
    record.hashedEmailOTP = await bcrypt.hash(emailOTP, 10);
    record.hashedMobileOTP = await bcrypt.hash(mobileOTP, 10);
    record.expiresAt = Date.now() + 5 * 60 * 1000;
    record.lastSentAt = Date.now();
    await record.save();

    await sendEmail({
      to: record.email,
      subject: "BeautyE OTP Resent",
      html: `<p>Your new OTP is <strong>${emailOTP}</strong>. Expires in 5 minutes.</p>`,
    });

    await twilioClient.messages.create({
      body: `Your BeautyE mobile OTP is ${mobileOTP}. Expires in 5 minutes.`,
      from: process.env.TWILIO_FROM,
      to: `+91${record.mobile}`,
    });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error during OTP resend" });
  }
};

/* =====================================================
   🟢 LOGIN (EMAIL OR MOBILE)
===================================================== */
export const login = async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }],
    });

    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        cart: user.cart,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   🟢 GET PROFILE
===================================================== */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching profile" });
  }
};

/* =====================================================
   🟣 FORGOT PASSWORD (SEND RESET LINK)
===================================================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account found with this email" });

    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your BeautyE Password",
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">Reset Password</a>
        <p>This link is valid for only 15 minutes.</p>
      `,
    });

    return res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Server error sending reset email" });
  }
};

/* =====================================================
   🟣 RESET PASSWORD (AFTER CLICKING LINK)
===================================================== */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return res.status(400).json({ message: "Invalid link" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(decoded.id, { password: hashed });

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(400).json({ message: "Expired or invalid reset link" });
  }
};
