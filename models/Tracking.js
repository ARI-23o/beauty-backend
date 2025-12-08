// server/models/Tracking.js
import mongoose from "mongoose";

const trackingSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    courier: { type: String, default: "MockCourier" },
    trackingNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["Created", "Processing", "In Transit", "Out for Delivery", "Delivered", "Exception"],
      default: "Created",
    },
    auto: {
      type: Boolean,
      default: true,
    },
    history: [
      {
        status: String,
        message: String,
        location: String,
        timestamp: { type: Date, default: Date.now },
        proof_url: String,
      },
    ],
    meta: {
      raw: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

const Tracking = mongoose.model("Tracking", trackingSchema);
export default Tracking;
