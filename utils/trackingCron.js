// server/utils/trackingCron.js
/**
 * Periodic poller that advances mock tracking statuses for entries marked auto=true.
 * Runs every N seconds (configured via env TRACKING_POLL_INTERVAL_SECONDS, default 300).
 *
 * The cron will:
 * - find tracking entries that are auto === true and not yet Delivered,
 * - call pollMockCourier (which may advance the status randomly),
 * - save and send email on Delivered transition.
 */

import Tracking from "../models/Tracking.js";
import Order from "../models/Order.js";
import { pollMockCourier } from "../services/mockTrackingService.js";
import sendEmail from "./sendEmail.js"; // path may vary — ensure correct relative path if needed
import path from "path";

const POLL_INTERVAL = parseInt(process.env.TRACKING_POLL_INTERVAL_SECONDS || "300", 10); // default 5 minutes

export const startTrackingCron = () => {
  console.log(`🔁 Tracking cron starting — interval ${POLL_INTERVAL}s`);
  setInterval(async () => {
    try {
      const pending = await Tracking.find({ auto: true, status: { $ne: "Delivered" } }).limit(50);
      for (const t of pending) {
        try {
          const prev = t.status;
          const updated = await pollMockCourier(t);
          // if advanced, save
          if (updated.status !== prev) {
            await updated.save();
            console.log(`🔄 Tracking ${t._id} advanced: ${prev} -> ${updated.status}`);

            // if delivered => update order and email
            if (updated.status === "Delivered") {
              const order = await Order.findById(updated.orderId).populate("userId", "name email");
              if (order) {
                order.status = "Delivered";
                await order.save();
                const recipient = order.userId?.email || order.shippingAddress?.email;
                if (recipient) {
                  await sendEmail({
                    to: recipient,
                    subject: `Your order ${order._id} is delivered`,
                    html: `<div style="font-family:Arial,sans-serif"><p>Your order ${order._id} has been delivered. Thank you!</p></div>`,
                  }).catch((e) => console.warn("Email failed:", e.message));
                }
              }
            }
          }
        } catch (innerErr) {
          console.warn("Error advancing single tracking:", innerErr.message || innerErr);
        }
      }
    } catch (err) {
      console.error("Tracking cron poll error:", err.message || err);
    }
  }, POLL_INTERVAL * 1000);
};
