// server.js
import dotenv from "dotenv";

import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import fs from "fs";
import connectDB from "./utils/connectDB.js";
import { fileURLToPath } from "url";

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import searchHistoryRoutes from "./routes/searchHistoryRoutes.js";
import filterRoutes from "./routes/filterRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js"; // <<-- NEW
import trackingRoutes from "./routes/trackingRoutes.js";
import { startTrackingCron } from "./utils/trackingCron.js";
import adminExportRoutes from "./routes/adminExportRoutes.js";
import adminStatsRoutes from "./routes/adminStatsRoutes.js";

dotenv.config();

const app = express();

// ---------- Multer setup for images & video ----------
// Ensure directories exist
const IMAGES_DIR = path.join(process.cwd(), "server", "images");
const VIDEO_DIR = path.join(process.cwd(), "server", "video");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

console.log("Cloudinary Loaded?", {
  name: process.env.CLOUDINARY_NAME,
  key: process.env.CLOUDINARY_KEY,
  secret: process.env.CLOUDINARY_SECRET ? "OK" : "MISSING",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// storage config that stores images in /server/images and videos in /server/video
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mime = file.mimetype || "";
    if (mime.startsWith("video/")) cb(null, VIDEO_DIR);
    else cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    // keep original name but prefix with timestamp to avoid collisions
    const safe = file.originalname.replace(/\s+/g, "-");
    const name = `${Date.now()}-${safe}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// ---------- Raw body endpoint for webhook (if any) ----------
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.isWebhook = true;
    next();
  },
  paymentRoutes
);

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- Tracking routes & cron ----------
app.use("/api/tracking", trackingRoutes);
app.use("/api/admin/stats", adminStatsRoutes);

// ---------- Connect DB ----------
connectDB();
// start tracking cron (auto-poll)
startTrackingCron();

app.post("/api/tracking/webhook/aftership", express.json(), async (req, res) => {
  // If you want to verify using your AFTERSHIP_WEBHOOK_SECRET you can do so here
  try {
    const payload = req.body;
    console.log("AfterShip webhook received:", JSON.stringify(payload).slice(0, 800));
    // parse and update local Tracking model: map payload -> trackingNumber & checkpoints
    // Example quick handler: find by trackingNumber and append checkpoints
    const trackingNumber = payload?.data?.tracking?.tracking_number || payload?.tracking_number;
    if (trackingNumber) {
      const Tracking = (await import("./models/Tracking.js")).default;
      const orderTracking = await Tracking.findOne({ trackingNumber }).sort({ createdAt: -1 });
      if (orderTracking) {
        const checkpoints = payload?.data?.tracking?.checkpoints || [];
        checkpoints.forEach((cp) => {
          orderTracking.history.push({
            status: cp.tag || cp.status,
            message: cp.message || cp.checkpoint_status || "",
            location: cp.city || cp.location || "",
            timestamp: cp.created_at || new Date(),
            proof_url: cp.attachment || undefined,
          });
        });
        // set status
        orderTracking.status = payload?.data?.tracking?.tag || orderTracking.status;
        await orderTracking.save();

        // if delivered -> update order status & send emails (reuse logic in controller if you want)
        if (orderTracking.status === "Delivered") {
          const Order = (await import("./models/Order.js")).default;
          const order = await Order.findById(orderTracking.orderId).populate("userId", "name email");
          if (order) {
            order.status = "Delivered";
            await order.save();
            // optional: send rating email using your sendEmail utility
          }
        }
      }
    }
    res.status(200).send({ ok: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    res.status(500).send({ ok: false });
  }
});

// ---------- Static file serving for images & video ----------
// When you host, ensure these folders are available at same relative path.
app.use("/images", express.static(IMAGES_DIR));
app.use("/video", express.static(VIDEO_DIR));
// Serve proof/media files exactly at /mnt/data/*
app.use("/proof", express.static(path.join(__dirname, "../mnt/data")));

app.use("/api/admin/export", adminExportRoutes);
// ---------- File upload endpoints (products) ----------
// Upload single file (image or video)
app.post("/api/products/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Build full URL
    const protocol = req.protocol;
    const host = req.get("host"); // includes port when running locally (e.g., localhost:5000)
    // Determine folder segment (images or video) based on mime type
    const isVideo = (req.file.mimetype || "").startsWith("video/");
    const urlPath = `${isVideo ? "video" : "images"}/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}/${urlPath}`;

    return res.status(201).json({ url: fullUrl, filename: req.file.filename });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// Upload multiple images (field name 'images') and a single video (field name 'video')
// This route accepts up to 5 images and 1 video; adjust limits as needed.
app.post(
  "/api/products/upload-multiple",
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const files = req.files || {};
      const protocol = req.protocol;
      const host = req.get("host");

      const imageUrls = (files.images || []).map((f) => `${protocol}://${host}/images/${f.filename}`);
      const videoUrls = (files.video || []).map((f) => `${protocol}://${host}/video/${f.filename}`);

      return res.status(201).json({
        images: imageUrls,
        video: videoUrls.length ? videoUrls[0] : "",
        filenames: {
          images: (files.images || []).map((f) => f.filename),
          video: (files.video && files.video[0] && files.video[0].filename) || "",
        },
      });
    } catch (err) {
      console.error("Multi upload error:", err);
      return res.status(500).json({ message: "Upload failed", error: err.message });
    }
  }
);

// ---------- Register routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/search-history", searchHistoryRoutes);
app.use("/api/filters", filterRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/test", testRoutes);
app.use("/api/favorites", favoriteRoutes);
// Root
app.get("/", (req, res) => res.send("💅 Luxury Beauty Backend Running"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
