// src/pages/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const Checkout = () => {
  const {
    cartItems,
    totalAmount,
    clearCart,
    loyaltyPoints,
    addLoyaltyPoints,
    calculateEarnedPoints,
  } = useCart();

  const navigate = useNavigate();

  // ===============================
  // 🔐 Decode JWT (SAFE)
  // ===============================
  const token = localStorage.getItem("token");
  let loggedInUser = null;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      loggedInUser = {
        id: payload.id || payload._id || payload.userId,
        email: payload.email,
        name: payload.name || payload.fullName || "",
      };
    } catch {
      loggedInUser = null;
    }
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!token || !loggedInUser?.id) {
      navigate("/login");
    }
  }, [token, loggedInUser, navigate]);

  // ===============================
  // 🧾 Form State
  // ===============================
  const [formData, setFormData] = useState({
    fullName: loggedInUser?.name || "",
    email: loggedInUser?.email || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "India",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Loyalty preview
  useEffect(() => {
    setEarnedPoints(calculateEarnedPoints(totalAmount));
  }, [totalAmount, calculateEarnedPoints]);

  const formatPrice = (amount) =>
    amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });

  // ===============================
  // ✅ Validators
  // ===============================
  const validators = {
    fullName: (v) =>
      /^[A-Za-z ]+$/.test(v)
        ? ""
        : "Full name should contain only alphabets",
    phone: (v) =>
      /^\d{10}$/.test(v)
        ? ""
        : "Phone number must be exactly 10 digits",
    address: (v) =>
      v.length >= 5 ? "" : "Address must be at least 5 characters",
    city: (v) =>
      /^[A-Za-z ]+$/.test(v)
        ? ""
        : "City should contain only alphabets",
    postalCode: (v) =>
      /^\d{6}$/.test(v)
        ? ""
        : "Postal code must be exactly 6 digits",
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(validators).forEach((field) => {
      const err = validators[field](formData[field]);
      if (err) newErrors[field] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    if (validators[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validators[name](value),
      }));
    }
  };

  // ===============================
  // 📦 Build Order Items
  // ===============================
  const buildOrderItems = () =>
    cartItems.map((item) => ({
      productId: item.productId || item._id || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    }));

  // ===============================
  // 💰 COD ORDER
  // ===============================
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    const orderData = {
      items: buildOrderItems(),
      totalAmount,
      shippingAddress: { ...formData },
      paymentMethod: "COD",
    };

    try {
      setIsLoading(true);

      const res = await api.post("/api/orders/checkout", orderData);

      if (res.data?.success) {
        const pts = addLoyaltyPoints(totalAmount);
        clearCart();

        navigate("/thankyou", {
          state: {
            name: formData.fullName,
            total: totalAmount,
            earnedPoints: pts,
          },
        });
      } else {
        alert("Order failed. Please try again.");
      }
    } catch (err) {
      console.error("Checkout Error:", err);
      alert("Unable to place order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ===============================
  // 💳 Razorpay
  // ===============================
  const handleRazorpayPayment = async () => {
    if (!validateAll()) return;

    try {
      setIsLoading(true);

      const { data } = await api.post("/api/payments/create-order", {
        amount: totalAmount,
        receipt: "rcpt_" + Date.now(),
        notes: { userId: loggedInUser.id },
      });

      const { order } = data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "BeautyE Store",
        description: "Order Payment",
        handler: async (response) => {
          try {
            const verifyRes = await api.post(
              "/api/payments/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id:
                  response.razorpay_payment_id,
                razorpay_signature:
                  response.razorpay_signature,
              }
            );

            if (verifyRes.data.success) {
              await api.post("/api/orders/checkout", {
                items: buildOrderItems(),
                totalAmount,
                shippingAddress: { ...formData },
                paymentMethod: "Razorpay",
              });

              const pts = addLoyaltyPoints(totalAmount);
              clearCart();

              navigate("/thankyou", {
                state: {
                  name: formData.fullName,
                  total: totalAmount,
                  earnedPoints: pts,
                },
              });
            } else {
              alert("Payment verification failed");
            }
          } catch (err) {
            console.error("Razorpay verify error:", err);
            alert("Verification failed. Try again.");
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: "#F37254" },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (err) {
      console.error("Razorpay init error:", err);
      alert("Unable to initialize payment.");
    } finally {
      setIsLoading(false);
    }
  };

  // ===============================
  // 🛒 Empty Cart
  // ===============================
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 min-h-[80vh]">
        <h2 className="text-3xl font-semibold mb-4">
          Your cart is empty 🛒
        </h2>
        <Link
          to="/shop"
          className="bg-pink-500 text-white px-6 py-3 rounded-lg"
        >
          Go Shopping
        </Link>
      </div>
    );
  }

  // ===============================
  // 🧾 UI (UNCHANGED)
  // ===============================
  return (
    <div className="bg-gray-50 py-24 px-6 md:px-20">
      <h2 className="text-4xl font-semibold text-center mb-10">
        Checkout
      </h2>

      <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
        {/* Billing */}
        <form
          onSubmit={handlePlaceOrder}
          className="bg-white p-8 rounded-2xl shadow"
        >
          <h3 className="text-2xl mb-6">Billing Details</h3>

          {[
            { label: "Full Name", name: "fullName" },
            { label: "Phone Number", name: "phone" },
            { label: "Address", name: "address", type: "textarea" },
            { label: "City", name: "city" },
            { label: "Postal Code", name: "postalCode" },
          ].map(({ label, name, type }) => (
            <div className="mb-5" key={name}>
              <label className="block mb-1">{label}</label>
              {type === "textarea" ? (
                <textarea
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              ) : (
                <input
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              )}
              {errors[name] && (
                <p className="text-red-500 text-sm">
                  {errors[name]}
                </p>
              )}
            </div>
          ))}

          <button
            disabled={isLoading}
            className="w-full bg-pink-500 text-white py-3 rounded-full"
          >
            {isLoading ? "Processing..." : "Place Order (COD)"}
          </button>

          <button
            type="button"
            onClick={handleRazorpayPayment}
            disabled={isLoading}
            className="w-full mt-3 bg-green-500 text-white py-3 rounded-full"
          >
            Pay with Razorpay
          </button>
        </form>

        {/* Summary */}
        <div className="bg-white p-8 rounded-2xl shadow">
          <h3 className="text-2xl mb-6">Order Summary</h3>

          {cartItems.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between border-b py-2"
            >
              <div>
                <p>{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
              <span>
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}

          <div className="mt-6 bg-pink-50 p-4 rounded">
            <p>
              Earn{" "}
              <strong>{earnedPoints}</strong> loyalty points
            </p>
            <p>
              Current balance:{" "}
              <strong>{loyaltyPoints}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
