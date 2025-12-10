// server/routes/adminContactRoutes.js
import express from "express";
import ContactMessage from "../models/ContactMessage.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { replyToContactMessage } from "../controllers/contactController.js";

const router = express.Router();

/**
 * GET /api/admin/contacts
 */
router.get("/admin/contacts", verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      ContactMessage.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactMessage.countDocuments(),
    ]);

    res.json({
      messages,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("admin/contacts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/admin/contacts/:id/replied
 */
router.patch("/admin/contacts/:id/replied", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const msg = await ContactMessage.findByIdAndUpdate(
      id,
      { replied: !!req.body.replied },
      { new: true }
    );

    if (!msg) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Updated", messageObj: msg });
  } catch (err) {
    console.error("admin/contacts replied error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/admin/contacts/:id
 */
router.delete("/admin/contacts/:id", verifyAdmin, async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!msg) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("admin/contacts delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ADMIN REPLY → SEND EMAIL TO USER
 * POST /api/admin/contacts/:id/reply
 */
router.post("/admin/contacts/:id/reply", verifyAdmin, replyToContactMessage);

export default router;
