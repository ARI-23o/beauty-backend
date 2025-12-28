import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/* =====================================================
   🔐 SMTP TRANSPORT (BREVO)
   ===================================================== */

if (
  !process.env.SMTP_HOST ||
  !process.env.SMTP_PORT ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASS
) {
  console.error("❌ Brevo SMTP environment variables are missing");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,            // smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT),    // 587
  secure: false,                          // TLS
  auth: {
    user: process.env.SMTP_USER,          // Brevo SMTP login
    pass: process.env.SMTP_PASS,          // Brevo SMTP key
  },
});

/* =====================================================
   📧 CORE EMAIL SENDER (USED EVERYWHERE)
   ===================================================== */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    console.log("📧 Sending email to:", to);

    if (!to) {
      throw new Error("Recipient email is missing");
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // BeautyE <no-reply@brevo.me>
      to,
      subject,
      html,
      attachments,
    });

    console.log("✅ Email accepted by SMTP:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return info;
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    throw error;
  }
};

export default sendEmail;

/* =====================================================
   🔢 OTP EMAIL
   ===================================================== */
export const sendEmailWithOTP = async (to, otp) => {
  const subject = "Your BeautyE OTP Verification Code";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#E91E63">OTP Verification</h2>
      <p>Your OTP code is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for <strong>5 minutes</strong>.</p>
      <p>Please do not share it with anyone.</p>
      <p>— BeautyE Team</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};

/* =====================================================
   🔑 PASSWORD RESET EMAIL
   ===================================================== */
export const sendPasswordResetEmail = async (to, link) => {
  const subject = "Reset Your BeautyE Password";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
      <p>This link expires in <strong>15 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>— BeautyE Team</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};

/* =====================================================
   ⭐ ORDER RATING REQUEST EMAIL
   ===================================================== */
export const sendRatingRequestEmail = async ({
  to,
  fullName,
  orderId,
  ratingLink,
}) => {
  const subject = `Rate your BeautyE order #${orderId}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#E91E63">Order Delivered 🎉</h2>
      <p>Hi ${fullName || "Customer"},</p>
      <p>Your order <strong>${orderId}</strong> has been delivered.</p>
      <p>
        <a href="${ratingLink}"
           style="background:#E91E63;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
          Rate Your Order
        </a>
      </p>
      <p>This link will be valid for 14 days.</p>
      <p>— BeautyE Team</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};

/* =====================================================
   📩 CONTACT → USER CONFIRMATION
   ===================================================== */
export const sendContactConfirmationEmail = async ({
  to,
  name,
  message,
}) => {
  const subject = "We received your message — BeautyE";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#E91E63">Thanks for contacting BeautyE</h2>
      <p>Hi ${name || "there"},</p>
      <p>We’ve received your message and will get back to you soon.</p>
      <blockquote style="border-left:4px solid #E91E63;padding-left:10px;">
        ${message}
      </blockquote>
      <p>— BeautyE Team</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};

/* =====================================================
   🛠 CONTACT → ADMIN NOTIFICATION
   ===================================================== */
export const sendContactAdminNotificationEmail = async ({
  name,
  email,
  phone,
  subject,
  message,
}) => {
  const adminEmail = process.env.ADMIN_CONTACT_NOTIFY;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Message:</strong></p>
      <blockquote>${message}</blockquote>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: subject || "New Contact Message",
    html,
  });
};

/* =====================================================
   ✉️ CONTACT REPLY (ADMIN → USER)
   ===================================================== */
export const sendContactReplyEmail = async ({
  to,
  name,
  subject,
  replyMessage,
}) => {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#E91E63">Reply from BeautyE Support</h2>
      <p>Hi ${name || "Customer"},</p>
      <p>${replyMessage.replace(/\n/g, "<br/>")}</p>
      <p>Warm regards,<br/>BeautyE Support Team</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};
