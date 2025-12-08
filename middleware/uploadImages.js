// server/middleware/uploadImages.js
import multer from "multer";
import path from "path";
import fs from "fs";
import cloudinary from "../utils/cloudinary.js"; // ⬅ CORRECT IMPORT

// Temp folder for uploads before Cloudinary
const tempDir = path.join(process.cwd(), "server", "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safe}`);
  },
});

// Allow JPG, PNG, WEBP
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only JPG, PNG, WEBP allowed"));
};

export const uploadImagesMulter = multer({ storage, fileFilter });

// Upload to Cloudinary
export const uploadImages = async (req, res, next) => {
  try {
    const uploaded = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "beauty_ecom/images",
        resource_type: "image",
        transformation: [
          { width: 1200, crop: "limit" },
          { quality: "auto" },
        ],
      });
console.log("Cloudinary result =>", result.secure_url);

      uploaded.push(result.secure_url);
      fs.unlinkSync(file.path); // delete temp file
    }

    req.imageUrls = uploaded;
    next();
  } catch (err) {
    console.error("Cloudinary image upload failed:", err);
    res.status(500).json({ message: "Image upload failed", error: err.message });
  }
};
