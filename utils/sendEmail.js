// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
    // You are already using simple "service" mode (gmail / etc.)
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Generic email sender (for admin notifications, order confirmations, etc.)
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    console.log("📧 Preparing to send email to:", to);

    const transporter = createTransporter();

    // verify connection (will throw if not configured properly)
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully!");
    } catch (verifyErr) {
      console.warn("⚠️ SMTP verify warning:", verifyErr?.message || verifyErr);
      // still attempt send; explicit failure will surface on sendMail
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"BeautyE" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw new Error(error.message || "Failed to send email");
  }
};

/**
 * Specialized OTP email sender (for signup/verification)
 */
export const sendEmailWithOTP = async (to, otp) => {
  const subject = "Your BeautyE Account OTP Verification Code";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#111">Your OTP Code</h2>
      <p>Dear User,</p>
      <p>Your OTP code for account verification is:</p>
      <h1 style="color:#E91E63">${otp}</h1>
      <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
      <p>Thanks,<br>BeautyE Team</p>
    </div>
  `;
  return await sendEmail({ to, subject, html });
};

/**
 * Password reset email (15 minute expiry note)
 */
export const sendPasswordResetEmail = async (to, link) => {
  return await sendEmail({
    to,
    subject: "Reset Your BeautyE Password",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="color:#111">Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${link}" target="_blank">${link}</a>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thanks,<br>BeautyE Team</p>
      </div>
    `,
  });
};

/**
 * Rating request email - when order delivered
 * link should be the frontend route to accept rating token: /rate-order/:token
 */
export const sendRatingRequestEmail = async ({ to, fullName, orderId, ratingLink }) => {
  return await sendEmail({
    to,
    subject: `How did we do? Rate your BeautyE order ${orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="color:#E91E63">Thanks for shopping with BeautyE!</h2>
        <p>Hi ${fullName || "Customer"},</p>
        <p>Your order <strong>${orderId}</strong> has been delivered. We’d love to know how we did.</p>
        <p>
          <a href="${ratingLink}" target="_blank" style="background:#E91E63;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
            Rate your order
          </a>
        </p>
        <p>Clicking the button will let you give a single rating for the whole order. Thank you — your feedback helps us improve.</p>
        <p>Warmly,<br/>BeautyE Team</p>
      </div>
    `,
  });
};

/**
 * NEW: Contact form confirmation email to customer
 * Call this right after saving ContactMessage.
 */
export const sendContactConfirmationEmail = async ({ to, name, message }) => {
  const subject = "We received your message — BeautyE";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#E91E63">Thanks for contacting BeautyE</h2>
      <p>Hi ${name || "there"},</p>
      <p>We have received your message and our team will get back to you as soon as possible.</p>
      <p><strong>Your message:</strong></p>
      <blockquote style="border-left:4px solid #E91E63;padding-left:10px;margin-left:0;color:#555;">
        ${message}
      </blockquote>
      <p>Meanwhile, you can continue exploring our latest luxury beauty products on our website.</p>
      <p>With love,<br/>BeautyE Team</p>
    </div>
  `;

  return await sendEmail({ to, subject, html });
};

/**
 * NEW: Contact form notification email to admin
 * Uses ADMIN_CONTACT_NOTIFY if present, otherwise falls back to EMAIL_USER.
 */
export const sendContactAdminNotificationEmail = async ({
  name,
  email,
  phone,
  subject,
  message,
  createdAt,
  ip,
  userAgent,
}) => {
  const to =
    process.env.ADMIN_CONTACT_NOTIFY ||
    process.env.EMAIL_USER ||
    process.env.EMAIL_FROM;

  if (!to) {
    console.warn("⚠️ No ADMIN_CONTACT_NOTIFY / EMAIL_USER set for admin contact notifications.");
    return;
  }

  const mailSubject = `New contact message from ${name || "Visitor"}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#111">New Contact Message</h2>
      <p><strong>Name:</strong> ${name || "—"}</p>
      <p><strong>Email:</strong> ${email || "—"}</p>
      <p><strong>Phone:</strong> ${phone || "—"}</p>
      <p><strong>Subject:</strong> ${subject || "—"}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:4px solid #ccc;padding-left:10px;margin-left:0;color:#555;">
        ${message}
      </blockquote>
      <hr/>
      <p style="font-size:12px;color:#888;">
        Submitted at: ${createdAt ? new Date(createdAt).toLocaleString() : "—"}<br/>
        IP: ${ip || "—"}<br/>
        User Agent: ${userAgent || "—"}
      </p>
    </div>
  `;

  return await sendEmail({
    to,
    subject: mailSubject,
    html,
  });
};

// -----------------------------
// CONTACT: SEND ADMIN → USER REPLY EMAIL
// -----------------------------
export const sendContactReplyEmail = async ({ to, name, subject, replyMessage }) => {
  const html = `
    <div style="font-family:Arial, Helvetica, sans-serif; line-height:1.6;">
      <h2 style="color:#E91E63;">Response from BeautyE Support</h2>
      <p>Hi ${name || "Customer"},</p>
      <p>${replyMessage.replace(/\n/g, "<br/>")}</p>
      <p style="margin-top:18px;">Warm regards,<br/>BeautyE Support Team</p>
    </div>
  `;

  return await sendEmail({
    to,
    subject,
    html,
  });
};


export default sendEmail;
