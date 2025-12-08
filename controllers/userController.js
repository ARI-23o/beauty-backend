import User from "../models/User.js";

/* -------------------------------------------------------------
   ✅ GET ALL USERS (ADMIN ONLY)
--------------------------------------------------------------*/
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
};

/* -------------------------------------------------------------
   ✅ DELETE USER (ADMIN ONLY)
--------------------------------------------------------------*/
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

/* -------------------------------------------------------------
   ✅ ✅ UPDATE USER CART (NO VALIDATION ERRORS)
--------------------------------------------------------------*/
export const updateUserCart = async (req, res) => {
  try {
    const userId = req.params.id;
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "Cart must be an array" });
    }

    // ✅ Update only the cart, skip validations on other fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { cart } },
      {
        new: true,                 // return updated doc
        runValidators: false,      // ✅ IMPORTANT: avoid validating email/mobile
      }
    ).select("cart");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Cart updated successfully",
      cart: updatedUser.cart,
    });
  } catch (error) {
    console.error("Update Cart Error:", error);
    res.status(500).json({ message: "Server error while updating cart" });
  }
};

/* -------------------------------------------------------------
   ✅ ✅ GET USER CART
--------------------------------------------------------------*/
export const getUserCart = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("cart");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ cart: user.cart || [] });
  } catch (error) {
    console.error("Get Cart Error:", error);
    res.status(500).json({ message: "Failed to load user cart" });
  }
};
