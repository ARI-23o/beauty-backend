import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  hashedEmailOTP: { type: String, required: true },
  hashedMobileOTP: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Date },
});

export default mongoose.model("OTP", otpSchema);
