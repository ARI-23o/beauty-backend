import express from "express";
import User from "../models/User.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// ✅ Get user's search history
router.get("/:userId/history", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("searchHistory");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ history: user.searchHistory || [] });
  } catch (error) {
    res.status(500).json({ message: "Error loading history", error });
  }
});
// ✅ Clear all search history
router.delete("/:userId/clear", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.searchHistory = [];
    await user.save();

    res.status(200).json({ message: "Search history cleared successfully" });
  } catch (error) {
    console.error("Clear History Error:", error);
    res.status(500).json({ message: "Error clearing history", error });
  }
});


// ✅ Add a search keyword
router.post("/:userId/add", verifyToken, async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ message: "Empty keyword ignored" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove duplicates
    user.searchHistory = user.searchHistory.filter(
      (k) => k.toLowerCase() !== keyword.toLowerCase()
    );

    // Add newest on top
    user.searchHistory.unshift(keyword);

    // Limit to 5
    user.searchHistory = user.searchHistory.slice(0, 5);

    await user.save();

    res.json({ history: user.searchHistory });
  } catch (error) {
    res.status(500).json({ message: "Error saving history", error });
  }
});

export default router;
