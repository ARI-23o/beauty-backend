// server/utils/aftership.js
import fetch from "node-fetch";

const AFTERSHIP_BASE = process.env.AFTERSHIP_BASE || "https://api.aftership.com/v4";
const AFTERSHIP_API_KEY = process.env.AFTERSHIP_API_KEY || "";

const headers = () => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "aftership-api-key": AFTERSHIP_API_KEY,
  };
};

export const createAfterShipTracking = async ({ courier, trackingNumber, title, customerName }) => {
  if (!AFTERSHIP_API_KEY) throw new Error("AFTERSHIP_API_KEY not configured");

  const body = {
    tracking: {
      slug: courier.toLowerCase(), // the slug must match AfterShip supported couriers — admin should use valid slug
      tracking_number: trackingNumber,
      title: title || `Order ${trackingNumber}`,
      customer_name: customerName || "",
    },
  };

  const r = await fetch(`${AFTERSHIP_BASE}/trackings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const json = await r.json();
  if (!r.ok) throw new Error(json.meta?.message || "AfterShip create failed");
  return json;
};

export const getAfterShipTracking = async ({ courierSlug, trackingNumber }) => {
  if (!AFTERSHIP_API_KEY) throw new Error("AFTERSHIP_API_KEY not configured");
  const path = `${AFTERSHIP_BASE}/trackings/${encodeURIComponent(courierSlug)}/${encodeURIComponent(trackingNumber)}`;
  const r = await fetch(path, { method: "GET", headers: headers() });
  const json = await r.json();
  if (!r.ok) throw new Error(json.meta?.message || "AfterShip fetch failed");
  return json;
};
