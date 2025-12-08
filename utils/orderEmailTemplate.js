// server/utils/orderEmailTemplate.js

export const generateOrderEmail = (order) => `
  <div style="font-family:Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #eee; border-radius:10px; overflow:hidden;">
    <div style="background:#111; color:#fff; padding:20px; text-align:center;">
      <h1>Thank you for your order, ${order.shippingAddress.fullName}!</h1>
    </div>
    <div style="padding:20px;">
      <p>Your order <strong>#${order._id}</strong> has been successfully placed.</p>
      <p><strong>Order Summary:</strong></p>
      <ul style="list-style:none; padding:0;">
        ${order.items.map(i => `
          <li style="border-bottom:1px solid #eee; padding:5px 0;">
            ${i.name} – ${i.quantity} × ₹${i.price} = ₹${i.quantity * i.price}
          </li>
        `).join("")}
      </ul>
      <p><strong>Total:</strong> ₹${order.totalAmount}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><strong>Shipping Address:</strong><br>
        ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.country} - ${order.shippingAddress.postalCode}
      </p>
      <p>We’ll notify you when your order is shipped.</p>
    </div>
    <div style="background:#f8f8f8; text-align:center; padding:10px; font-size:12px;">
      BeautyE © ${new Date().getFullYear()} | Luxury Beauty & Care
    </div>
  </div>
`;

export const generateInvoiceEmail = (order) => `
  <div style="font-family:Arial, sans-serif; max-width:600px; margin:auto;">
    <h2>Your BeautyE Order #${order._id} has been Delivered 🎉</h2>
    <p>Hello ${order.shippingAddress.fullName},</p>
    <p>We’re delighted to inform you that your order has been delivered successfully.</p>
    <p>Your invoice is attached to this email.</p>
    <p>Thank you for shopping with <strong>BeautyE</strong>. We hope you enjoy your products!</p>
    <hr>
    <p style="font-size:12px; color:#888;">BeautyE © ${new Date().getFullYear()}</p>
  </div>
`;
