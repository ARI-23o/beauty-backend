// server/controllers/trackingController.js
import Tracking from "../models/Tracking.js";
import Order from "../models/Order.js";
import { createMockTracking, pollMockCourier } from "../services/mockTrackingService.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import cloudinary from "../utils/cloudinary.js";

dotenv.config();

const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

// Local file to use as mock proof if you don't have real proof files in /mnt/data
// (You can set process.env.MOCK_PROOF_FILE to override)
const MOCK_PROOF_FILENAME = process.env.MOCK_PROOF_FILE || "1a04eb56-a656-4235-8d9e-03e00d8fe6f3.mp4";

// When true and Cloudinary credentials are present, controller will upload local proof files to Cloudinary
const USE_CLOUDINARY_FOR_PROOFS = process.env.USE_CLOUDINARY_FOR_PROOFS === "true";

// Helper to check Cloudinary config presence
const cloudinaryReady = !!process.env.CLOUDINARY_NAME && !!process.env.CLOUDINARY_KEY && !!process.env.CLOUDINARY_SECRET;

/**
 * Normalize a stored proof value into a URL that the frontend can open in a new tab.
 * - If already a http(s) URL, return as-is.
 * - If it contains an absolute path to /mnt/data or similar, return BACKEND + /proof/<filename>.
 * - If it's a bare filename, assume /proof/<filename>.
 */
const normalizeProofUrl = (raw) => {
  if (!raw) return raw;
  try {
    const s = String(raw);
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    // If it's a path containing mnt/data
    if (s.includes("/mnt/data/") || s.includes("\\mnt\\data\\")) {
      const filename = path.basename(s);
      return `${BACKEND.replace(/\/$/, "")}/proof/${filename}`;
    }
    // If it's a path containing server/video or server/images or similar
    if (s.includes("/video/") || s.includes("/images/")) {
      // If it already looks like a backend-served path with absolute host removed
      const maybeFile = path.basename(s);
      return `${BACKEND.replace(/\/$/, "")}/proof/${maybeFile}`;
    }
    // If it's simple filename
    if (s.includes(".") && s.length < 200) {
      const filename = path.basename(s);
      return `${BACKEND.replace(/\/$/, "")}/proof/${filename}`;
    }
    // otherwise return as-is
    return s;
  } catch (e) {
    return raw;
  }
};

/* ============================================================
   POST /api/tracking/:orderId/create
   Admin creates tracking for an order
   ============================================================ */
export const createTrackingForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courier = "MockCourier", auto = true, useAftership = false } = req.body || {};

    if (!orderId) return res.status(400).json({ message: "orderId required" });

    const order = await Order.findById(orderId).populate("userId", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // If client asked to use AfterShip and env is configured, try it (best-effort)
    if (useAftership && !!process.env.AFTERSHIP_API_KEY) {
      try {
        const { createAfterShipTracking } = await import("../utils/aftership.js");
        const randomTn = `AS-${Date.now().toString().slice(-6)}`;
        const courierSlug = courier.toLowerCase();

        const response = await createAfterShipTracking({
          courier: courierSlug,
          trackingNumber: randomTn,
          title: `Order ${order._id}`,
          customerName: order.shippingAddress?.fullName || order.userId?.name,
        });

        const track = new Tracking({
          orderId,
          courier: courierSlug,
          trackingNumber: randomTn,
          status: "Processing",
          auto: !!auto,
          history: [{ status: "Created", message: "Tracking created via AfterShip", timestamp: new Date() }],
          meta: { aftership: response },
        });

        await track.save();

        order.tracking = order.tracking || [];
        order.tracking.push(track._id);
        order.trackingMetadata = { courier: courierSlug, trackingNumber: randomTn };
        order.status = "Shipped";
        await order.save();

        const recipient = order.userId?.email || order.shippingAddress?.email;
        if (recipient) {
          await sendEmail({
            to: recipient,
            subject: `Your order ${order._id} has shipped`,
            html: `<p>Your order <strong>${order._id}</strong> has shipped. Track: <a href="${FRONTEND}/track-order/${order._id}">Track Order</a></p>`,
          }).catch((e) => console.warn("Email send failed", e.message));
        }

        return res.status(201).json({ message: "AfterShip tracking created", tracking: track });
      } catch (err) {
        console.warn("AfterShip create failed, falling back to mock:", err.message || err);
        // continue to mock flow
      }
    }

    // Mock-tracking fallback
    const mock = await createMockTracking({ orderId, courier });
    const track = new Tracking({
      orderId,
      courier,
      trackingNumber: mock.trackingNumber,
      status: mock.status,
      auto: !!auto,
      history: mock.history,
      meta: { createdWith: "mock" },
    });

    await track.save();

    order.tracking = order.tracking || [];
    order.tracking.push(track._id);
    order.trackingMetadata = { courier, trackingNumber: mock.trackingNumber };
    order.status = "Shipped";
    await order.save();

    const recipient = order.userId?.email || order.shippingAddress?.email;
    if (recipient) {
      await sendEmail({
        to: recipient,
        subject: `Your order ${order._id} has shipped`,
        html: `
          <div>
            <p>Your order <strong>${order._id}</strong> has been shipped.</p>
            <p>Courier: ${courier}</p>
            <p>Tracking number: <strong>${mock.trackingNumber}</strong></p>
            <p><a href="${FRONTEND}/track-order/${order._id}">Track your order</a></p>
            <p>Thanks,<br/>BeautyE Team</p>
          </div>
        `,
      }).catch((e) => console.warn("Email failed:", e.message));
    }

    return res.status(201).json({ message: "Tracking created", tracking: track });
  } catch (err) {
    console.error("createTrackingForOrder error:", err);
    return res.status(500).json({ message: "Failed to create tracking", error: err.message || err });
  }
};

/* ============================================================
   GET /api/tracking/order/:orderId
   Return latest tracking entry (authenticated user)
   Route should be protected by verifyToken in router
   ============================================================ */
export const getTrackingForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ message: "orderId required" });

    const order = await Order.findById(orderId).populate("userId", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Security: allow if requesting user is admin OR user owns order
    if (!req.user?.isAdmin && req.user?.id?.toString() !== order.userId?._id?.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Use .lean() because we just return data to frontend; normalize proof urls before sending
    let track = await Tracking.findOne({ orderId }).sort({ createdAt: -1 }).lean();
    if (!track) return res.status(404).json({ message: "No tracking found for this order" });

    // If AfterShip available and meta exists, try to fetch live info (best-effort)
    if (!!process.env.AFTERSHIP_API_KEY && track.meta?.aftership) {
      try {
        const { getAfterShipTracking } = await import("../utils/aftership.js");
        const courierSlug = track.meta.aftership?.data?.tracking?.slug || track.courier;
        const tn = track.trackingNumber;
        const live = await getAfterShipTracking({ courierSlug, trackingNumber: tn });

        if (live && live.data && live.data.tracking) {
          const as = live.data.tracking;
          const timeline = (as.checkpoints || []).map((cp) => ({
            status: cp.tag || cp.status,
            message: cp.message || cp.checkpoint_status || "",
            location: cp.city || cp.location || "",
            timestamp: cp.created_at || cp.checkpoint_time || new Date(),
            proof_url: cp.attachment || undefined,
          }));
          // merge stored history then append live ones
          track.history = [...(track.history || []), ...timeline];
          track.meta = track.meta || {};
          track.meta.aftership = as;
          track.status = as.tag || track.status;
        }
      } catch (err) {
        console.warn("AfterShip fetch failed:", err.message || err);
      }
    }

    // Normalize proof_url entries so frontend opens a real absolute URL (not a frontend route)
    if (Array.isArray(track.history)) {
      track.history = track.history.map((h) => {
        if (!h || !h.proof_url) return h;
        const normalized = normalizeProofUrl(h.proof_url);
        return { ...h, proof_url: normalized };
      });
    }

    return res.status(200).json(track);
  } catch (err) {
    console.error("getTrackingForOrder error:", err);
    return res.status(500).json({ message: "Failed to fetch tracking", error: err.message || err });
  }
};

/* ============================================================
   PATCH /api/tracking/:trackingId/status
   Admin manual override
   ============================================================ */
export const updateTrackingStatus = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { status, message } = req.body;
    if (!trackingId) return res.status(400).json({ message: "trackingId required" });
    if (!status) return res.status(400).json({ message: "status required" });

    const track = await Tracking.findById(trackingId);
    if (!track) return res.status(404).json({ message: "Tracking not found" });

    track.status = status;
    track.history.push({ status, message: message || `Status set to ${status} by admin`, timestamp: new Date() });
    await track.save();

    // propagate to order if Delivered
    if (String(status).toLowerCase().includes("delivered")) {
      const order = await Order.findById(track.orderId).populate("userId", "name email");
      if (order) {
        order.status = "Delivered";
        await order.save();

        // send rating email
        const token = jwt.sign(
          { orderId: order._id, userId: order.userId?._id },
          process.env.RATING_TOKEN_SECRET || process.env.JWT_SECRET,
          { expiresIn: "14d" }
        );
        const ratingLink = `${FRONTEND}/rate-order/${token}`;
        const recipient = order.userId?.email || order.shippingAddress?.email;
        if (recipient) {
          await sendEmail({
            to: recipient,
            subject: `Your order ${order._id} is delivered — please rate`,
            html: `<p>Your order has been delivered. Rate here: <a href="${ratingLink}">Rate order</a></p>`,
          }).catch((e) => console.warn("Rating email failed", e.message));
        }
      }
    }

    return res.json({ message: "Tracking updated", tracking: track });
  } catch (err) {
    console.error("updateTrackingStatus error:", err);
    return res.status(500).json({ message: "Failed to update tracking", error: err.message || err });
  }
};

/* ============================================================
   POST /api/tracking/:trackingId/poll
   Admin: force poll (mock or aftership)
   - For mock flow we will auto-append a proof_url when transitioning to Delivered.
   - When USE_CLOUDINARY_FOR_PROOFS=true and cloudinary is configured, a local mock file will be uploaded to Cloudinary
     and the cloudinary URL will be attached as proof_url. Otherwise we attach BACKEND/proof/<filename>.
   ============================================================ */
export const pollTrackingNow = async (req, res) => {
  try {
    const { trackingId } = req.params;
    if (!trackingId) return res.status(400).json({ message: "trackingId required" });

    // Use mongoose document here because we may mutate and save
    const track = await Tracking.findById(trackingId);
    if (!track) return res.status(404).json({ message: "Tracking not found" });

    // AfterShip branch
    if (!!process.env.AFTERSHIP_API_KEY && track.meta?.aftership) {
      try {
        const { getAfterShipTracking } = await import("../utils/aftership.js");
        const courierSlug = track.meta.aftership?.data?.tracking?.slug || track.courier;
        const tn = track.trackingNumber;
        const live = await getAfterShipTracking({ courierSlug, trackingNumber: tn });

        if (live && live.data && live.data.tracking) {
          const as = live.data.tracking;
          const timeline = (as.checkpoints || []).map((cp) => ({
            status: cp.tag || cp.status,
            message: cp.message || "",
            location: cp.city || "",
            timestamp: cp.created_at || new Date(),
            proof_url: cp.attachment || undefined,
          }));
          track.history = timeline;
          track.status = as.tag || track.status;
          track.meta.aftership = as;
          await track.save();
        }
      } catch (err) {
        console.warn("AfterShip poll failed:", err.message || err);
      }
    } else {
      // Mock poll
      await pollMockCourier(track);

      // Ensure track is saved with new status/history
      await track.save();

      // If became Delivered and no proof present, attach a proof
      if (String(track.status).toLowerCase().includes("delivered")) {
        const last = (Array.isArray(track.history) && track.history[track.history.length - 1]) || null;
        const alreadyHasProof = last && last.proof_url;
        if (!alreadyHasProof) {
          // prefer Cloudinary if requested and configured
          let proofUrl = null;

          if (USE_CLOUDINARY_FOR_PROOFS && cloudinaryReady) {
            try {
              // local path where your mock file should exist (project relative)
              // many setups put files under project root /mnt/data — ensure the file exists there
              const localPath = path.join(process.cwd(), "mnt", "data", MOCK_PROOF_FILENAME);
              if (fs.existsSync(localPath)) {
                // upload to Cloudinary (resource_type 'auto' so video/images work)
                const uploadRes = await cloudinary.uploader.upload(localPath, {
                  resource_type: "auto",
                  folder: `tracking_proofs/${track._id}`,
                  use_filename: true,
                  unique_filename: false,
                });
                if (uploadRes && uploadRes.secure_url) {
                  proofUrl = uploadRes.secure_url;
                }
              } else {
                console.warn("Mock proof file not found at", localPath, "— falling back to backend static file");
              }
            } catch (e) {
              console.warn("Cloudinary upload failed:", e.message || e);
              proofUrl = null;
            }
          }

          // fallback to backend-served proof path if cloudinary not used or failed
          if (!proofUrl) {
            const filename = MOCK_PROOF_FILENAME;
            proofUrl = `${BACKEND.replace(/\/$/, "")}/proof/${path.basename(filename)}`;
          }

          // append proof history entry
          track.history = track.history || [];
          track.history.push({
            status: "Delivered",
            message: "Delivered (mock) — proof attached",
            timestamp: new Date(),
            location: "Destination",
            proof_url: proofUrl,
          });

          await track.save();
        }
      }
    }

    // propagate to order if delivered
    if (String(track.status).toLowerCase().includes("delivered")) {
      const order = await Order.findById(track.orderId).populate("userId", "name email");
      if (order) {
        order.status = "Delivered";
        await order.save();

        // optional: send rating email
        const token = jwt.sign(
          { orderId: order._id, userId: order.userId?._id },
          process.env.RATING_TOKEN_SECRET || process.env.JWT_SECRET,
          { expiresIn: "14d" }
        );
        const ratingLink = `${FRONTEND}/rate-order/${token}`;
        const recipient = order.userId?.email || order.shippingAddress?.email;
        if (recipient) {
          await sendEmail({
            to: recipient,
            subject: `Your order ${order._id} has been delivered`,
            html: `<p>Your order has been delivered. Please rate: <a href="${ratingLink}">Rate order</a></p>`,
          }).catch((e) => console.warn("Email failed", e.message));
        }
      }
    }

    return res.json({ message: "Polled tracking", tracking: track });
  } catch (err) {
    console.error("pollTrackingNow error:", err);
    return res.status(500).json({ message: "Failed to poll tracking", error: err.message || err });
  }
};


