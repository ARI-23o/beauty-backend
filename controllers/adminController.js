import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

/**
 * @desc Admin Login
 * @route POST /api/admin/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT with isAdmin field
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        isAdmin: true, // ✅ add this
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      admin: { id: admin._id, email: admin.email },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during admin login" });
  }
};

/**
 * @desc Verify Admin Token
 * @route GET /api/admin/verify
 */
export const verifyAdminToken = (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ message: "Admin verified", admin: decoded });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
