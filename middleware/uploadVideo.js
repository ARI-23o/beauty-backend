// server/middleware/uploadVideo.js
import multer from "multer";
import path from "path";
import fs from "fs";
import cloudinary from "../utils/cloudinary.js"; // ⬅ CORRECT IMPORT

const tempDir = path.join(process.cwd(), "server", "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const videoFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/mpeg", "video/quicktime"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only MP4, MPEG or MOV allowed"));
};

export const uploadVideoMulter = multer({ storage, fileFilter: videoFilter });

export const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "beauty_ecom/video",
      resource_type: "video",
      chunk_size: 6000000,
      transformation: [{ quality: "auto" }],
    });

    req.videoUrl = result.secure_url;
    fs.unlinkSync(req.file.path);

    next();
  } catch (err) {
    console.error("Cloudinary video upload error:", err);
    res.status(500).json({ message: "Video upload failed", error: err.message });
  }
};
