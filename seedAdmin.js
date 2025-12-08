// server/seedAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existing = await Admin.findOne({ email: "admin@example.com" });
    if (existing) {
      console.log("⚠️ Admin already exists. Skipping creation.");
      mongoose.disconnect();
      return;
    }

    const hash = await bcrypt.hash("yourStrongAdminPassword", 10);
    const admin = new Admin({ name: "Site Admin", email: "admin@example.com", password: hash, isSuperAdmin: true });
    await admin.save();
    console.log("🎉 Admin created successfully!");
  } catch (err) {
    console.error("❌ Error creating admin:", err);
  } finally {
    mongoose.disconnect();
  }
};

run();
