// server/models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      email: { type: String, required: false },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "Online", "Razorpay"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending",
    },

    // OPTIONAL: link to Tracking model (one-to-many if you want history)
    tracking: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tracking",
      },
    ],

    // metadata saved at time of shipping (optional)
    trackingMetadata: {
      courier: String,
      trackingNumber: String,
    },

    rated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
