import FilterOptions from "../models/FilterOptions.js";
import Product from "../models/Product.js";

/**
 * GET /api/filters
 * Public: returns filter settings
 * Auto-fills categories & brands from products if missing
 */
export const getFilters = async (req, res) => {
  try {
    let filters = await FilterOptions.findOne();

    // Create default filter doc if missing
    if (!filters) {
      filters = new FilterOptions({
        categories: [],
        brands: [],
        priceRanges: [
          { label: "Under ₹499", min: 0, max: 499 },
          { label: "₹500 - ₹999", min: 500, max: 999 },
          { label: "₹1000+", min: 1000, max: 999999 }
        ]
      });
      await filters.save();
    }

    // Fetch all products to auto-fill categories & brands
    const products = await Product.find();

    // Auto-fill categories
    if (!filters.categories.length) {
      filters.categories = [
        ...new Set(
          products.map((p) => (p.category || "").trim().toLowerCase())
        )
      ].filter(Boolean);
    }

    // Auto-fill brands
    if (!filters.brands.length) {
      filters.brands = [
        ...new Set(products.map((p) => (p.brand || "").trim().toLowerCase()))
      ].filter(Boolean);
    }

    await filters.save();

    res.status(200).json(filters);
  } catch (err) {
    console.error("Error getting filters:", err);
    res.status(500).json({
      message: "Failed to load filters",
      error: err.message,
    });
  }
};

/**
 * PUT /api/filters
 * Admin updates entire list
 */
export const updateFilters = async (req, res) => {
  try {
    const { categories, brands, priceRanges } = req.body;

    let filters = await FilterOptions.findOne();
    if (!filters) filters = new FilterOptions();

    if (Array.isArray(categories)) {
      filters.categories = categories
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);
    }

    if (Array.isArray(brands)) {
      filters.brands = brands
        .map((b) => b.trim().toLowerCase())
        .filter(Boolean);
    }

    if (Array.isArray(priceRanges)) {
      filters.priceRanges = priceRanges
        .map((r) => ({
          label: r.label || `${r.min} - ${r.max}`,
          min: Number(r.min || 0),
          max: Number(r.max || 999999),
        }))
        .filter((r) => r.label && !isNaN(r.min) && !isNaN(r.max));
    }

    await filters.save();

    res.status(200).json({ message: "Filters updated", filters });
  } catch (err) {
    console.error("Error updating filters:", err);
    res.status(500).json({ message: "Failed to update filters", error: err.message });
  }
};

/**
 * POST /api/filters/add-category
 */
export const addCategory = async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ message: "Category required" });

    let filters = await FilterOptions.findOne();
    if (!filters) filters = new FilterOptions();

    const c = category.trim().toLowerCase();
    if (!filters.categories.includes(c)) {
      filters.categories.push(c);
    }

    await filters.save();
    res.status(200).json(filters);
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};

/**
 * POST /api/filters/remove-category
 */
export const removeCategory = async (req, res) => {
  try {
    const { category } = req.body;

    let filters = await FilterOptions.findOne();
    if (!filters) return res.status(404).json({ message: "Filters not found" });

    filters.categories = filters.categories.filter(
      (c) => c !== category.toLowerCase()
    );

    await filters.save();
    res.status(200).json(filters);
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};

/**
 * POST /api/filters/add-brand
 */
export const addBrand = async (req, res) => {
  try {
    const { brand } = req.body;
    if (!brand) return res.status(400).json({ message: "Brand required" });

    let filters = await FilterOptions.findOne();
    if (!filters) filters = new FilterOptions();

    const b = brand.trim().toLowerCase();
    if (!filters.brands.includes(b)) {
      filters.brands.push(b);
    }

    await filters.save();
    res.status(200).json(filters);
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};

/**
 * POST /api/filters/remove-brand
 */
export const removeBrand = async (req, res) => {
  try {
    const { brand } = req.body;

    let filters = await FilterOptions.findOne();
    if (!filters) return res.status(404).json({ message: "Filters not found" });

    filters.brands = filters.brands.filter(
      (b) => b !== brand.toLowerCase()
    );

    await filters.save();
    res.status(200).json(filters);
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};
