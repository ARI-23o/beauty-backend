// server/utils/sendEmail.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// ==============================
// 🔐 Initialize Resend
// ==============================
const resend = new Resend(process.env.RESEND_API_KEY);

// ==============================
// 📧 Core Email Sender
// ==============================
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    console.log("📧 Preparing to send email to:", to);

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing in environment variables");
    }

    if (!process.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is missing in environment variables");
    }

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      attachments, // Resend supports attachments
    });

    console.log("✅ Email sent successfully via Resend:", response.id);
    return response;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

export default sendEmail;

// =====================================================
// 🔢 OTP Email
// =====================================================
export const sendEmailWithOTP = async (to, otp) => {
  const subject = "Your BeautyE OTP Verification Code";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="color:#E91E63">OTP Verification</h2>
      <p>Your OTP code is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
      <p>— BeautyE Team</p>
    </div>
  `;

  return await sendEmail({ to, subject, html });
};

// =====================================================
// 🔑 Password Reset Email
// =====================================================
export const sendPasswordResetEmail = async (to, link) => {
  const subject = "Reset Your BeautyE Password";

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Password Reset</h2>
      <p>Click below to reset your password:</p>
      <a href="${link}">${link}</a>
      <p>This link expires in 15 minutes.</p>
    </div>
  `;

  return await sendEmail({ to, subject, html });
};

// =====================================================
// ⭐ Rating Request Email
// =====================================================
export const sendRatingRequestEmail = async ({
  to,
  fullName,
  orderId,
  ratingLink,
}) => {
  const subject = `Rate your BeautyE order #${orderId}`;

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Order Delivered 🎉</h2>
      <p>Hi ${fullName || "Customer"},</p>
      <p>Your order <b>${orderId}</b> has been delivered.</p>
      <a href="${ratingLink}" style="background:#E91E63;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">
        Rate Your Order
      </a>
    </div>
  `;

  return await sendEmail({ to, subject, html });
};

// =====================================================
// 📩 Contact Form - User Confirmation
// =====================================================
export const sendContactConfirmationEmail = async ({ to, name, message }) => {
  const subject = "We received your message — BeautyE";

  const html = `
    <div>
      <h2>Thanks for contacting BeautyE</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your message:</p>
      <blockquote>${message}</blockquote>
    </div>
  `;

  return await sendEmail({ to, subject, html });
};

// =====================================================
// 🛠 Admin Notification Email
// =====================================================
export const sendContactAdminNotificationEmail = async ({
  name,
  email,
  phone,
  subject,
  message,
}) => {
  const adminEmail =
    process.env.ADMIN_CONTACT_NOTIFY || process.env.EMAIL_FROM;

  const html = `
    <div>
      <h2>New Contact Message</h2>
      <p>Name: ${name}</p>
      <p>Email: ${email}</p>
      <p>Phone: ${phone}</p>
      <p>Message: ${message}</p>
    </div>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: subject || "New Contact Message",
    html,
  });
};
