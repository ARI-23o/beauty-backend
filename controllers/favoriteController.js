// server/controllers/favoriteController.js
import User from "../models/User.js";
import Product from "../models/Product.js";

/**
 * GET /api/favorites
 * Return current user's favorites (populated with product data)
 */
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).populate({
      path: "favorites",
      select: "-__v -createdAt -updatedAt",
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ favorites: user.favorites || [] });
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ message: "Failed to load favorites", error: err.message });
  }
};


/**
 * POST /api/favorites/:productId
 * Add a product to user's favorites
 */
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { productId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!productId) return res.status(400).json({ message: "Missing productId" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const exists = user.favorites?.some((f) => f.toString() === productId);

    if (!exists) {
      user.favorites.push(productId);

      // ⭐ CRITICAL FIX
      await user.save({ validateBeforeSave: false });
    }

    const populated = await User.findById(userId).populate({
      path: "favorites",
      select: "-__v -createdAt -updatedAt",
    });

    res.status(200).json({
      message: "Added to favorites",
      favorites: populated.favorites || []
    });

  } catch (err) {
    console.error("Error adding favorite:", err);
    res.status(500).json({ message: "Failed to add favorite", error: err.message });
  }
};


/**
 * DELETE /api/favorites/:productId
 * Remove product from favorites
 */
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { productId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!productId) return res.status(400).json({ message: "Missing productId" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.favorites = (user.favorites || []).filter(
      (f) => f.toString() !== productId
    );

    // ⭐ CRITICAL FIX
    await user.save({ validateBeforeSave: false });

    const populated = await User.findById(userId).populate({
      path: "favorites",
      select: "-__v -createdAt -updatedAt",
    });

    res.status(200).json({
      message: "Removed from favorites",
      favorites: populated.favorites || []
    });

  } catch (err) {
    console.error("Error removing favorite:", err);
    res.status(500).json({ message: "Failed to remove favorite", error: err.message });
  }
};
