// server/services/mockTrackingService.js
// Mock courier simulation WITH CLOUDINARY PROOF URL

import Tracking from "../models/Tracking.js";
import cloudinary from "../utils/cloudinary.js";

/**
 * createMockTracking({ orderId, courier })
 * Returns an object { trackingNumber, status, history }
 */
export const createMockTracking = async ({ orderId, courier = "MockCourier" }) => {
  const tn = `MOCK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date();

  const history = [
    {
      status: "Created",
      message: "Shipment created in mock system",
      timestamp: now.toISOString(),
      location: "Warehouse"
    },
    {
      status: "Processing",
      message: "Package processed",
      timestamp: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
      location: "Sorting center"
    }
  ];

  return { trackingNumber: tn, status: "Processing", history };
};

/**
 * pollMockCourier(tracking)
 * Simulates a status update + CLOUDINARY PROOF URL when Delivered
 */
export const pollMockCourier = async (trackingDoc) => {
  const t = trackingDoc.toObject ? trackingDoc.toObject() : { ...trackingDoc };

  const sequence = ["Created", "Processing", "In Transit", "Out for Delivery", "Delivered"];
  const idx = sequence.indexOf(t.status || "Created");
  const nextIdx = Math.min(sequence.length - 1, idx + 1);
  const nextStatus = sequence[nextIdx];

  let proofUrl = undefined;

  // Only attach proof on "Delivered"
  if (nextStatus === "Delivered") {
    try {
      // Upload sample mock proof (a placeholder image) to Cloudinary ONCE
      const upload = await cloudinary.uploader.upload(
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        {
          folder: "tracking_proofs",
          public_id: `mock_proof_${trackingDoc._id}`,
          overwrite: true
        }
      );

      proofUrl = upload.secure_url;
    } catch (err) {
      console.error("Cloudinary proof upload failed:", err.message);
      proofUrl = null;
    }
  }

  const entry = {
    status: nextStatus,
    message: nextStatus === "Delivered" ? "Package delivered successfully" : "Status updated",
    timestamp: new Date(),
    location: nextStatus === "Delivered" ? "Destination" : "On route",
    proof_url: proofUrl,
  };

  t.status = nextStatus;
  t.history = Array.isArray(t.history) ? [...t.history, entry] : [entry];

  if (trackingDoc.save) {
    trackingDoc.status = t.status;
    trackingDoc.history = t.history;
  }

  return trackingDoc;
};
 