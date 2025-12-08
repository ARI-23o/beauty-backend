// server/controllers/productController.js
import Product from "../models/Product.js";

/**
 * Create Product (Admin)
 * Accepts payload where image can be a single URL string,
 * images can be an array of URL strings, and video a single URL string.
 */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      description,
      price,
      image,   // optional single image URL
      images,  // optional array of image URLs
      video,   // optional single video URL
      countInStock,
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }

    const normalizedCategory = category.trim().toLowerCase();

    const newProduct = new Product({
      name: name.trim(),
      brand: brand?.trim() || "unknown",
      category: normalizedCategory,
      description: description?.trim() || "",
      price: Number(price),
      image: image || (Array.isArray(images) && images.length ? images[0] : "") || "",
      images: Array.isArray(images) ? images : images ? [images] : [],
      video: video || "",
      countInStock: countInStock ?? 0,
    });

    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({ message: "Failed to create product", error: err.message });
  }
};

/**
 * Get all products (optionally search)
 */
export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Return products sorted newest first
    const products = await Product.find(query).sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
};

/**
 * Get single product by id (includes rating summary fields already present on product)
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (err) {
    console.error("❌ Error fetching product by ID:", err);
    res.status(500).json({ message: "Failed to load product details", error: err.message });
  }
};

/**
 * Update product
 * Accepts body fields same as create: image, images[], video are expected to be full URLs
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (updates.category) updates.category = updates.category.trim().toLowerCase();

    // If client sends images as JSON string, try parse
    if (typeof updates.images === "string") {
      try { updates.images = JSON.parse(updates.images); } catch { updates.images = [updates.images]; }
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) product[key] = updates[key];
    });

    const updated = await product.save();
    res.status(200).json(updated);
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ message: "Failed to update product", error: err.message });
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
};
