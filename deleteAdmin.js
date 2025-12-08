// deleteAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await Admin.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} admin(s).`);
  } catch (err) {
    console.error("❌ Error deleting admins:", err);
  } finally {
    mongoose.disconnect();
  }
};

run();
