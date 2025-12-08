// server/controllers/ratingController.js
import jwt from "jsonwebtoken";
import Rating from "../models/Rating.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();

const RATING_TOKEN_SECRET = process.env.RATING_TOKEN_SECRET || process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Validate rating token and return order + product listing (sanity)
 * GET /api/ratings/validate/:token
 */
export const validateRatingToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: "Token required" });

    let payload;
    try {
      payload = jwt.verify(token, RATING_TOKEN_SECRET);
    } catch (err) {
      return res.status(410).json({ message: "Invalid or expired rating link" });
    }

    const { orderId, userId } = payload;
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Return minimal product info for the rating page
    const products = order.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
    }));

    return res.status(200).json({
      orderId: order._id,
      userId: order.userId,
      products,
      message: "Token valid",
    });
  } catch (err) {
    console.error("validateRatingToken error:", err);
    res.status(500).json({ message: "Server error validating token" });
  }
};

/**
 * Submit rating for an order (combined rating for all products).
 * POST /api/ratings/submit
 * body: { token, rating, comment }
 */
export const submitOrderRating = async (req, res) => {
  try {
    const { token, rating, comment } = req.body;
    if (!token || !rating) return res.status(400).json({ message: "Token and rating required" });

    let payload;
    try {
      payload = jwt.verify(token, RATING_TOKEN_SECRET);
    } catch (err) {
      return res.status(410).json({ message: "Invalid or expired rating link" });
    }

    const { orderId, userId } = payload;
    const order = await Order.findById(orderId).populate("userId", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Create rating entry for each product in the order
    const createdRatings = [];
    for (const it of order.items) {
      const newRating = new Rating({
        productId: it.productId,
        userId: userId || order.userId?._id,
        orderId: order._id,
        rating: Number(rating),
        comment: comment ? String(comment).trim() : "",
        reviewerName: order.shippingAddress?.fullName || order.userId?.name || "Customer",
      });
      await newRating.save();
      createdRatings.push(newRating);

      // Update product aggregates: ratingAvg and ratingCount
      try {
        const product = await Product.findById(it.productId);
        if (product) {
          const prevAvg = Number(product.ratingAvg || 0);
          const prevCount = Number(product.ratingCount || 0);
          const newCount = prevCount + 1;
          const newAvg = (prevAvg * prevCount + Number(rating)) / newCount;
          product.ratingAvg = Number(newAvg.toFixed(2));
          product.ratingCount = newCount;
          await product.save();
        }
      } catch (prodErr) {
        console.warn("Failed updating product aggregate:", prodErr.message || prodErr);
      }
    }

    // Optionally mark order as rated (to avoid re-rating) - add field on order
    try {
      order.rated = true;
      await order.save();
    } catch (err) {
      console.warn("Could not mark order rated:", err.message || err);
    }

    // Send a thank-you email to the customer (non-blocking)
    const recipient = order.userId?.email || order.shippingAddress?.email;
    if (recipient) {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="color:#E91E63">Thank you for rating your order!</h2>
          <p>We've received your rating for order <strong>${order._id}</strong>. We appreciate your feedback — it helps us improve BeautyE.</p>
          <p>Thanks,<br/>BeautyE Team</p>
        </div>
      `;
      sendEmail({ to: recipient, subject: "Thanks for your feedback — BeautyE", html }).catch((e) =>
        console.warn("Thank-you email failed:", e.message || e)
      );
    }

    return res.status(201).json({ message: "Thank you for your feedback!", ratingsSaved: createdRatings.length });
  } catch (err) {
    console.error("submitOrderRating error:", err);
    res.status(500).json({ message: "Server error saving rating" });
  }
};

/**
 * Get product ratings + aggregated values
 * GET /api/ratings/product/:productId
 */
export const getProductRatings = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ message: "Product ID required" });

    // aggregate average and reviews
    const reviews = await Rating.find({ productId }).sort({ createdAt: -1 }).lean();
    const count = reviews.length;
    const avg = count ? Number((reviews.reduce((s, r) => s + Number(r.rating), 0) / count).toFixed(2)) : 0;

    return res.status(200).json({ avg, count, reviews });
  } catch (err) {
    console.error("getProductRatings error:", err);
    res.status(500).json({ message: "Server error fetching product ratings" });
  }
};
