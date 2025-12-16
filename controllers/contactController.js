// controllers/contactController.js
import ContactMessage from "../models/ContactMessage.js";
import sendEmail from "../utils/sendEmail.js";

/**
 * USER → CREATE CONTACT MESSAGE
 * POST /api/contact
 */
export const createContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const contact = await ContactMessage.create({
      name,
      email,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
    });

  } catch (err) {
    console.error("Create contact error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ADMIN → REPLY TO CONTACT
 * POST /api/admin/contacts/:id/reply
 */
export const replyToContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const message = await ContactMessage.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Contact message not found" });
    }

    message.replied = true;
    message.replyText = reply;
    message.repliedAt = new Date();
    await message.save();

    // ✅ Respond immediately
    res.json({ success: true, message: "Reply sent successfully" });

    // 🔥 Send email in background
    sendEmail({
      to: message.email,
      subject: "Reply from BeautyE Store",
      html: `
        <p>${reply}</p>
        <br/>
        <strong>BeautyE Store</strong>
      `,
    }).catch((err) => {
      console.error("Email failed:", err.message);
    });

  } catch (err) {
    console.error("Reply contact error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
};
