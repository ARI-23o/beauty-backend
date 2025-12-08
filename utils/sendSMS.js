// server/utils/sendSMS.js
import dotenv from "dotenv";
dotenv.config();

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM || null;

export async function sendSMSWithOTP(mobile, otp) {
  // mobile should be 10-digit Indian number; adjust country code as necessary
  if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    throw new Error("Twilio not configured. Please set TWILIO_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM in .env");
  }

  // Lazy import the Twilio client (so project won't crash if not installed)
  const twilio = await import("twilio");
  const client = twilio.default(TWILIO_SID, TWILIO_AUTH_TOKEN);

  // Prepend country code if not present; here we assume India (+91). Adapt as needed.
  let toNumber = mobile;
  if (!mobile.startsWith("+")) {
    toNumber = `+91${mobile}`; // change default country code if desired
  }

  const message = `Your verification OTP is ${otp}. It is valid for 5 minutes.`;

  const msg = await client.messages.create({
    body: message,
    from: TWILIO_FROM,
    to: toNumber,
  });
  console.log("TWILIO_SID:", process.env.TWILIO_SID);
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN);
console.log("TWILIO_FROM:", process.env.TWILIO_FROM);


  return msg;
}
