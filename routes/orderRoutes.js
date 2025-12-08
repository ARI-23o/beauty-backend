// server/routes/orderRoutes.js
import express from "express";
import {
  checkoutOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  generateInvoice,
  getUserOrders,
} from "../controllers/orderController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import verifyToken from "../middleware/verifyToken.js";
import Order from "../models/Order.js";
import PDFDocument from "pdfkit";

const router = express.Router();

/* =============================
   ✅ USER ROUTES
   ============================= */

// ✅ Place an order (Checkout)
router.post("/checkout", verifyToken, checkoutOrder);

// ✅ Get all orders for logged-in user
router.get("/my-orders", verifyToken, getUserOrders);

// ✅ Get a specific order by ID for that user
router.get("/my-orders/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching user order:", error);
    res.status(500).json({ message: "Failed to fetch order details" });
  }
});

// ✅ Allow user to download invoice (only if Delivered)
router.get("/my-orders/:id/invoice", verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "Delivered") {
      return res
        .status(403)
        .json({ message: "Invoice available only after delivery" });
    }

    const pdf = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${order._id}.pdf`
    );

    pdf.fontSize(20).text("BeautyE - Invoice", { align: "center" });
    pdf.moveDown();
    pdf.fontSize(12).text(`Order ID: ${order._id}`);
    pdf.text(
      `Customer: ${
        order.shippingAddress?.fullName || order.userId?.name || "Customer"
      }`
    );
    pdf.text(
      `Email: ${
        order.shippingAddress?.email || order.userId?.email || "N/A"
      }`
    );
    pdf.text(`Address: ${order.shippingAddress?.address || "N/A"}`);
    pdf.moveDown();

    pdf.text("Items:", { underline: true });
    order.items.forEach((item, index) => {
      pdf.text(
        `${index + 1}. ${item.name} — ${item.quantity} × ₹${item.price} = ₹${
          item.quantity * item.price
        }`
      );
    });

    pdf.moveDown();
    pdf.text(`Total Amount: ₹${order.totalAmount}`, { align: "right" });
    pdf.text(`Payment Method: ${order.paymentMethod || "N/A"}`);
    pdf.text(`Status: ${order.status}`);
    pdf.moveDown();
    pdf.text("Thank you for shopping with BeautyE!", { align: "center" });

    pdf.end();
    pdf.pipe(res);
  } catch (error) {
    console.error("❌ Error generating user invoice:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
});

/* =============================
   ✅ ADMIN ROUTES
   ============================= */
router.get("/", verifyAdmin, getAllOrders);
router.get("/:id", verifyAdmin, getOrderById);
router.put("/:id/status", verifyAdmin, updateOrderStatus);
router.delete("/:id", verifyAdmin, deleteOrder);
router.get("/:id/invoice", verifyAdmin, generateInvoice);

export default router;
