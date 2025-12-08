import express from "express";
import twilio from "twilio";

const router = express.Router();

router.post("/send-test-otp", async (req, res) => {
  try {
    const { mobile } = req.body;

    const client = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const otp = Math.floor(100000 + Math.random() * 900000);

    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    });

    res.json({ success: true, otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
