// server/utils/sendEmail.js

import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// =====================================================
// 🔐 Initialize Resend Client
// =====================================================
if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY is missing in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// =====================================================
// 📧 Core Email Sender (USED EVERYWHERE)
// =====================================================
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    console.log("📧 Preparing to send email to:", to);

    if (!to) {
      throw new Error("Recipient email (to) is missing");
    }

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || "BeautyE <onboarding@resend.dev>",
      to,
      subject,
      html,
      attachments,
    });

    console.log("✅ Resend response:", JSON.stringify(response, null, 2));

    return response;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

export default sendEmail;

// =====================================================
// 🔢 OTP EMAIL
// =====================================================
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

  return await sendEmail({ to, subject, html });
};

// =====================================================
// 🔑 PASSWORD RESET EMAIL
// =====================================================
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

  return await sendEmail({ to, subject, html });
};

// =====================================================
// ⭐ ORDER RATING REQUEST EMAIL
// =====================================================
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
      <p>We would love your feedback.</p>
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

  return await sendEmail({ to, subject, html });
};

// =====================================================
// 📩 CONTACT FORM → USER CONFIRMATION
// =====================================================
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
      <p><strong>Your message:</strong></p>
      <blockquote style="border-left:4px solid #E91E63;padding-left:10px;color:#555">
        ${message}
      </blockquote>
      <p>— BeautyE Team</p>
    </div>
  `;

  return await sendEmail({ to, subject, html });
};

// =====================================================
// 🛠 CONTACT FORM → ADMIN NOTIFICATION
// =====================================================
export const sendContactAdminNotificationEmail = async ({
  name,
  email,
  phone,
  subject,
  message,
}) => {
  const adminEmail =
    process.env.ADMIN_CONTACT_NOTIFY ||
    process.env.EMAIL_FROM ||
    "onboarding@resend.dev";

  const mailSubject = subject || "New Contact Message";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${name || "—"}</p>
      <p><strong>Email:</strong> ${email || "—"}</p>
      <p><strong>Phone:</strong> ${phone || "—"}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:4px solid #ccc;padding-left:10px;color:#555">
        ${message}
      </blockquote>
    </div>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: mailSubject,
    html,
  });
};

// =====================================================
// ✉️ CONTACT REPLY EMAIL (ADMIN → USER)
// =====================================================
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

  return await sendEmail({ to, subject, html });
};
