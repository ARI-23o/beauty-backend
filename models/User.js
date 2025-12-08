import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1,
    },
    image: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    // ✅ Cart stored inside user
    cart: {
      type: [cartItemSchema],
      default: [],
    },

    // search history & lastSearch
    searchHistory: {
      type: [String],
      default: [],
    },

    lastSearch: {
      type: String,
      default: "",
    },

    // ✅ NEW: favorites/wishlist (array of Product ObjectIds)
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

// Optional: helper method to check favorite - you can call user.isFavorited(productId)
userSchema.methods.isFavorited = function (productId) {
  if (!productId) return false;
  const pid = typeof productId === "string" ? productId : productId.toString();
  return (this.favorites || []).some((f) => (f ? f.toString() === pid : false));
};

const User = mongoose.model("User", userSchema);
export default User;
