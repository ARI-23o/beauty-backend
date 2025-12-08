// server/models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    // single thumbnail or primary image (optional)
    image: { type: String },
    // multiple images (array)
    images: { type: [String], default: [] },
    // short product video URL
    video: { type: String, default: "" },
    countInStock: { type: Number, default: 0 },

    // Rating summary fields (kept on product for fast reads)
    avgRating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Normalize brand & category before saving
productSchema.pre("save", function (next) {
  if (this.category && typeof this.category === "string") {
    this.category = this.category.trim().toLowerCase();
  }
  if (this.brand && typeof this.brand === "string") {
    this.brand = this.brand.trim().toLowerCase();
  }
  next();
});

// Ensure normalization on updates via findOneAndUpdate etc.
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (!update) return next();
  if (update.category && typeof update.category === "string") {
    update.category = update.category.trim().toLowerCase();
  }
  if (update.brand && typeof update.brand === "string") {
    update.brand = update.brand.trim().toLowerCase();
  }
  this.setUpdate(update);
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
