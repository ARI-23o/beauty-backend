// server/middleware/verifyToken.js
import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // ✅ handle both: "Bearer <token>" and "<token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: "Token missing or malformed" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
  id: decoded.id || decoded._id || decoded.userId,
  email: decoded.email || null,
  name: decoded.name || null,
};

    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export default verifyToken;
