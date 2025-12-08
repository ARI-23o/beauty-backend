// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
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

export default sendEmail;
