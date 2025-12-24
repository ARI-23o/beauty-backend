// server/controllers/orderController.js
import Order from "../models/Order.js";
import sendEmail from "../utils/sendEmail.js";
import { generateOrderEmail, generateInvoiceEmail } from "../utils/orderEmailTemplate.js";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();
const RATING_TOKEN_SECRET = process.env.RATING_TOKEN_SECRET || process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* =============================
   ✅ Get all orders for logged-in user
   ============================= */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id; // from verifyToken middleware
    console.log("📦 Fetching orders for user:", userId);

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(200).json([]); // ✅ Return empty array instead of 404
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to fetch user orders" });
  }
};

/* =============================
   ✅ Checkout - Place an Order
   ============================= */
export const checkoutOrder = async (req, res) => {
  try {
    console.log("🟢 Checkout Request Body:", JSON.stringify(req.body, null, 2));

    // ✅ Extract user from token
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      console.error("❌ No valid user ID found in token");
      return res.status(401).json({ message: "Unauthorized. Please log in again." });
    }

    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0 || !totalAmount) {
      console.error("❌ Missing required order fields");
      return res.status(400).json({ message: "Missing required order fields" });
    }

    // ✅ Create new order
    const order = new Order({
      userId,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount,
      shippingAddress: {
        ...shippingAddress,
        email: userEmail || shippingAddress?.email || "noemail@beautye.com",
      },
      paymentMethod: paymentMethod || "COD",
      paymentStatus: paymentMethod === "Razorpay" ? "Paid" : "Pending",
      status: "Pending",
      rated: false,
    });

    const savedOrder = await order.save();
    console.log("✅ Order saved successfully:", savedOrder._id);

    // ✅ Send confirmation email
    const recipient = userEmail || shippingAddress?.email;
    if (recipient) {
      try {
        sendEmail({
  to: recipient,
  subject: "Order Confirmation – BeautyE",
  html: generateOrderEmail(savedOrder),
}).catch((err) => {
  console.error("📧 Email send failed (non-blocking):", err.message);
});

        console.log("📧 Confirmation email sent to:", recipient);
      } catch (emailErr) {
        console.error("❌ Failed to send confirmation email:", emailErr.message);
      }
    } else {
      console.warn("⚠️ No recipient email found, skipping email send.");
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: savedOrder,
    });
  } catch (err) {
    console.error("❌ Error in checkoutOrder:", err);
    res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: err.message,
    });
  }
};

/* =============================
   ✅ Admin Routes
   ============================= */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "name email");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("userId", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate("userId", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const prevStatus = order.status;
    order.status = status || order.status;
    await order.save();

    // If delivered → generate invoice + rating email
    if (status === "Delivered") {
      // invoice generation (server-side PDF + email)
      try {
        const __dirname = path.resolve();
        const invoiceDir = path.join(__dirname, "server", "invoices");
        if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

        const pdfPath = path.join(invoiceDir, `invoice_${order._id}.pdf`);
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.fontSize(20).text("BeautyE - Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${order._id}`);
        doc.text(`Customer: ${order.shippingAddress?.fullName || order.userId?.name || "Customer"}`);
        doc.text(`Email: ${order.userId?.email || order.shippingAddress?.email || "N/A"}`);
        doc.text(`Address: ${order.shippingAddress?.address || "N/A"}`);
        if (order.shippingAddress?.city || order.shippingAddress?.country) {
          doc.text(
            `City: ${order.shippingAddress?.city || ""}${
              order.shippingAddress?.country ? ", " + order.shippingAddress.country : ""
            }`
          );
        }
        doc.moveDown();

        doc.text("Items:", { underline: true });
        order.items.forEach((item, index) => {
          doc.text(`${index + 1}. ${item.name} — ${item.quantity} × ₹${item.price} = ₹${item.quantity * item.price}`);
        });
        doc.moveDown();
        doc.text(`Total Amount: ₹${order.totalAmount}`, { align: "right" });
        doc.text(`Payment Method: ${order.paymentMethod || "N/A"}`);
        doc.text(`Status: ${order.status}`);
        doc.moveDown();
        doc.text("Thank you for shopping with BeautyE!", { align: "center" });
        doc.end();

        await new Promise((resolve) => stream.on("finish", resolve));

        const recipientEmail = order.userId?.email || order.shippingAddress?.email || null;
        if (recipientEmail) {
          try {
            // send invoice email
            await sendEmail({
              to: recipientEmail,
              subject: `Your BeautyE Order #${order._id} Invoice`,
              html: generateInvoiceEmail(order),
              attachments: [{ filename: `invoice_${order._id}.pdf`, path: pdfPath }],
            });
            console.log("📦 Invoice email sent successfully to:", recipientEmail);
          } catch (emailErr) {
            console.error("❌ Failed to send invoice email:", emailErr.message || emailErr);
          }
        } else {
          console.warn("⚠️ No email available for the order; invoice not emailed.");
        }
      } catch (invoiceErr) {
        console.error("❌ Invoice generation error:", invoiceErr);
      }

      // --- Rating request email (combined rating link)
      try {
        const token = jwt.sign({ orderId: order._id, userId: order.userId?._id }, RATING_TOKEN_SECRET, {
          expiresIn: "14d",
        });
        const ratingLink = `${FRONTEND_URL}/rate-order/${token}`;
        const recipientEmail = order.userId?.email || order.shippingAddress?.email || null;
        const fullName = order.shippingAddress?.fullName || order.userId?.name || "Customer";

        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Your BeautyE Order ${order._id} — We'd love your feedback`,
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2 style="color:#E91E63">Your order has been delivered</h2>
                <p>Hi ${fullName},</p>
                <p>Your order <strong>${order._id}</strong> has been marked as <strong>Delivered</strong>. We would be grateful if you could take a moment to rate your order.</p>
                <p><a href="${ratingLink}" style="background:#E91E63;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">Rate your order</a></p>
                <p>This link will be valid for 14 days.</p>
                <p>Thanks,<br/>BeautyE Team</p>
              </div>
            `,
          });
          console.log("📧 Rating request email sent to", recipientEmail);
        }
      } catch (ratingErr) {
        console.error("❌ Failed to send rating request email:", ratingErr);
      }
    }

    res.json({ message: "Order status updated successfully", order });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    await order.deleteOne();
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const pdf = new PDFDocument({ margin: 50 });
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => {
      const result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice_${order._id}.pdf`);
      res.send(result);
    });

    pdf.fontSize(20).text("BeautyE - Invoice", { align: "center" });
    pdf.moveDown();
    pdf.fontSize(12).text(`Order ID: ${order._id}`);
    pdf.text(`Customer: ${order.shippingAddress.fullName}`);
    pdf.text(`Email: ${order.shippingAddress.email}`);
    pdf.text(`Address: ${order.shippingAddress.address}`);
    pdf.moveDown();
    pdf.text("Items:", { underline: true });
    order.items.forEach((item, index) => {
      pdf.text(`${index + 1}. ${item.name} — ${item.quantity} × ₹${item.price} = ₹${item.quantity * item.price}`);
    });
    pdf.moveDown();
    pdf.text(`Total Amount: ₹${order.totalAmount}`, { align: "right" });
    pdf.end();
  } catch (err) {
    console.error("❌ Error generating invoice:", err);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};
