import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ 1. Create Razorpay order
router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const orderOptions = {
      amount: Math.round(Number(amount) * 100), // rupees → paise
      currency,
      receipt: receipt || "rcpt_" + Date.now(),
      payment_capture: 1,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(orderOptions);
    return res.json({ success: true, order });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

// ✅ 2. Verify payment signature (after checkout success)
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // TODO: update your Order model here → mark as paid
      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("❌ Error verifying payment:", error);
    return res.status(500).json({ error: "Server error verifying payment" });
  }
});

// ✅ 3. Razorpay Webhook verification (raw body handled in server.js)
router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (signature === expectedSignature) {
      const eventData = JSON.parse(req.body.toString());
      console.log("✅ Verified Webhook Event:", eventData.event);
      // TODO: Handle events like "payment.captured", "payment.failed"
      return res.status(200).json({ status: "ok" });
    } else {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return res.status(500).json({ error: "Webhook server error" });
  }
});

export default router;
