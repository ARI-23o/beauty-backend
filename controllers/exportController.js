// server/controllers/exportController.js
import Order from "../models/Order.js";
import { Parser } from "json2csv";
import ExcelJS from "exceljs";

/**
 * GET /api/admin/orders/export?format=csv|excel&status=&courier=
 * Exports orders matching optional filters to CSV or Excel.
 * Admin only (route should use verifyAdmin).
 */
export const exportOrders = async (req, res) => {
  try {
    const { format = "csv", status, courier } = req.query;
    const filter = {};

    if (status && status !== "All") filter.status = status;
    // filter by trackingMetadata.courier if provided
    if (courier) filter["trackingMetadata.courier"] = { $regex: new RegExp(courier, "i") };

    const orders = await Order.find(filter).populate("userId", "name email").lean();

    // Map to flattened rows
    const rows = orders.map((o) => ({
      orderId: o._id.toString(),
      customerName: (o.userId && o.userId.name) || (o.shippingAddress && o.shippingAddress.fullName) || "",
      customerEmail: (o.userId && o.userId.email) || (o.shippingAddress && o.shippingAddress.email) || "",
      phone: o.shippingAddress?.phone || "",
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString() : "",
      courier: (o.trackingMetadata && o.trackingMetadata.courier) || "",
      trackingNumber: (o.trackingMetadata && o.trackingMetadata.trackingNumber) || "",
      items: (o.items || []).map((it) => `${it.name} x${it.quantity}`).join(" | "),
    }));

    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Orders");
      ws.columns = [
        { header: "Order ID", key: "orderId", width: 30 },
        { header: "Customer Name", key: "customerName", width: 25 },
        { header: "Customer Email", key: "customerEmail", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Amount", key: "totalAmount", width: 12 },
        { header: "Status", key: "status", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
        { header: "Courier", key: "courier", width: 18 },
        { header: "Tracking No", key: "trackingNumber", width: 25 },
        { header: "Items", key: "items", width: 60 },
      ];
      ws.addRows(rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="orders_${Date.now()}.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

    // default CSV
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="orders_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("exportOrders error:", err);
    res.status(500).json({ message: "Failed to export orders", error: err.message });
  }
};
