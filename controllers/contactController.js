// server/controllers/contactController.js

import ContactMessage from "../models/ContactMessage.js";
import {
  sendContactConfirmationEmail,
  sendContactAdminNotificationEmail,
  sendContactReplyEmail,
} from "../utils/sendEmail.js";

/**
 * PUBLIC CONTACT FORM → USER SUBMITS QUERY
 * POST /api/contact
 */
export const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Name, email and message are required",
      });
    }

    const contact = await ContactMessage.create({
      name,
      email,
      phone: phone || "",
      subject: subject || "",
      message,
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    // 1) CONFIRMATION EMAIL TO USER
    try {
      await sendContactConfirmationEmail({
        to: email,
        name,
        message,
      });
    } catch (err) {
      console.error("❌ User confirmation email failed:", err.message);
    }

    // 2) NOTIFY ADMIN
    try {
      await sendContactAdminNotificationEmail({
        name,
        email,
        phone,
        subject,
        message,
        createdAt: contact.createdAt,
        ip: contact.ip,
        userAgent: contact.userAgent,
      });
    } catch (err) {
      console.error("❌ Admin notification email failed:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Your message has been received successfully.",
      contactId: contact._id,
    });
  } catch (err) {
    console.error("❌ createContactMessage error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to submit contact form. Please try again later.",
    });
  }
};

/**
 * ADMIN → SEND REPLY TO CUSTOMER
 * POST /api/admin/contacts/:id/reply
 */
export const replyToContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, replyMessage } = req.body;

    if (!subject || !replyMessage) {
      return res.status(400).json({
        message: "Subject and reply message are required",
      });
    }

    const contact = await ContactMessage.findById(id);
    if (!contact) {
      return res.status(404).json({ message: "Message not found" });
    }

    // SEND EMAIL TO CUSTOMER
    try {
      await sendContactReplyEmail({
        to: contact.email,
        name: contact.name,
        subject,
        replyMessage,
      });
    } catch (err) {
      console.error("❌ Failed to send reply email:", err.message);
      return res.status(500).json({
        message: "Failed to send reply email",
      });
    }

    // MARK MESSAGE AS REPLIED
    contact.replied = true;
    await contact.save();

    return res.json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (err) {
    console.error("❌ replyToContactMessage error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
};
