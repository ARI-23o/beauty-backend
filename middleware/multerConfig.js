// server/middleware/multerConfig.js
import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Multer configuration for product media uploads
 * - images: stored in /uploads/products/images
 * - video: stored in /uploads/products/videos
 *
 * Accepts multiple images (max 5) and one video (max configured below).
 */

// ensure upload directories exist
const rootUploads = path.join(process.cwd(), "server", "uploads", "products");
const imagesDir = path.join(rootUploads, "images");
const videosDir = path.join(rootUploads, "videos");

[ rootUploads, imagesDir, videosDir ].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// file size limit for images (MB converted to bytes)
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per image
// video max (you said high-quality; D — set to 500 MB safe upper bound)
const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

// allowed mimetypes
const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/mov", "video/x-m4v", "video/webm", "video/ogg"]);

// storage engine - choose destination based on fieldname
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") cb(null, videosDir);
    else cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  }
});

// file filter
const fileFilter = (req, file, cb) => {
  const m = file.mimetype;
  if (file.fieldname === "video") {
    if (VIDEO_MIMES.has(m)) cb(null, true);
    else cb(new Error("Invalid video type. Allowed: mp4, mov, webm, quicktime"), false);
  } else {
    if (IMAGE_MIMES.has(m)) cb(null, true);
    else cb(new Error("Invalid image type. Allowed: jpeg, png, webp, gif"), false);
  }
};

// limits: we limit per-file in size check in fileFilter? Multer allows total fileSize limit; we'll do custom check in middleware below
const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 6, // max total files (images up to 5 + 1 video)
    // We can't set different per-field fileSize limits in multer directly — we'll enforce after upload if needed
  }
});

// custom middleware wrapper to enforce sizes and counts
const productMediaUpload = (req, res, next) => {
  const uploader = upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]);

  uploader(req, res, (err) => {
    if (err) return next(err);

    // enforce per-file size checks (multer already wrote the files)
    const files = [];
    if (req.files?.images) files.push(...req.files.images.map(f => ({ ...f, type: "image" })));
    if (req.files?.video) files.push(...req.files.video.map(f => ({ ...f, type: "video" })));

    // validate
    for (const f of files) {
      if (f.type === "image" && f.size > IMAGE_MAX_BYTES) {
        // delete uploaded file then error
        try { fs.unlinkSync(f.path); } catch (e) {}
        return next(new Error(`Image "${f.originalname}" exceeds max size of ${IMAGE_MAX_BYTES / (1024*1024)} MB`));
      }
      if (f.type === "video" && f.size > VIDEO_MAX_BYTES) {
        try { fs.unlinkSync(f.path); } catch (e) {}
        return next(new Error(`Video "${f.originalname}" exceeds max size of ${VIDEO_MAX_BYTES / (1024*1024)} MB`));
      }
    }

    // all good
    next();
  });
};

export default productMediaUpload;

