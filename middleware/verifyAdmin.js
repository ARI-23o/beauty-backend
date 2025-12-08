// server/middleware/verifyAdmin.js
import jwt from "jsonwebtoken";

export const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

   if (decoded.role !== "admin")
 {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error("❌ verifyAdmin error:", err.message);
    res.status(403).json({ message: "Invalid or expired admin token." });
  }
};
