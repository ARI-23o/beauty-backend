// server/controllers/adminStatsController.js
import Order from "../models/Order.js";
import mongoose from "mongoose";

/**
 * GET /api/admin/stats/orders-summary
 * Returns counts by status and revenue by day (last 14 days)
 */
export const ordersSummary = async (req, res) => {
  try {
    // by status
    const byStatusAgg = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const byStatus = {};
    byStatusAgg.forEach((r) => (byStatus[r._id] = r.count));

    // revenue by day (last 14 days)
    const days = 14;
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0,0,0,0);

    const byDayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // build day array with zeros for missing days
    const dayMap = {};
    byDayAgg.forEach((r) => (dayMap[r._id] = r.revenue));
    const byDay = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay.push({ date: key, revenue: dayMap[key] || 0 });
    }

    res.json({ byStatus, byDay });
  } catch (err) {
    console.error("ordersSummary error:", err);
    res.status(500).json({ message: "Failed to compute stats", error: err.message });
  }
};
