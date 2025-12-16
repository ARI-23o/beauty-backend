// controllers/contactController.js
import ContactMessage from "../models/ContactMessage.js";
import sendEmail from "../utils/sendEmail.js";

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

    // Save reply info
    message.replied = true;
    message.replyText = reply;
    message.repliedAt = new Date();
    await message.save();

    // ✅ Respond immediately (NO waiting for email)
    res.json({
      success: true,
      message: "Reply saved and sent successfully",
    });

    // 🔥 Send email in background (non-blocking)
    sendEmail({
      to: message.email,
      subject: "Reply from BeautyE Store",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h3>Hello ${message.name || "Customer"},</h3>
          <p>${reply}</p>
          <br/>
          <p>Regards,<br/><strong>BeautyE Store</strong></p>
        </div>
      `,
    }).catch((err) => {
      console.error("Email sending failed:", err.message);
    });

  } catch (err) {
    console.error("Reply contact error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
