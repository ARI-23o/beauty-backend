import { v2 as cloudinary } from "cloudinary";

console.log("Cloudinary Config Loaded:");
console.log("Name:", process.env.CLOUDINARY_NAME);
console.log("Key:", process.env.CLOUDINARY_KEY ? "OK" : "MISSING");
console.log("Secret:", process.env.CLOUDINARY_SECRET ? "OK" : "MISSING");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export default cloudinary;
