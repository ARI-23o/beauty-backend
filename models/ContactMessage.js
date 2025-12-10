// server/models/ContactMessage.js
import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    /**
     * replied: whether someone from support has replied to this user
     * (you can toggle this from admin panel later)
     */
    replied: {
      type: Boolean,
      default: false,
    },
    /**
     * handled: generic flag for "processed" or "taken care of".
     * Kept separate from replied so you can track internal actions.
     */
    handled: {
      type: Boolean,
      default: false,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Avoid OverwriteModelError in dev/hot-reload
const ContactMessage =
  mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", contactMessageSchema);

export default ContactMessage;
