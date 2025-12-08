// server/controllers/uploadController.js
import path from "path";
import fs from "fs";

/**
 * Upload controller for product media
 * Expects req.files.{images,video}
 * Returns public URLs for stored files
 *
 * Uses the app served static route /uploads (see server.js patch below).
 */

const buildUrl = (req, relativePath) => {
  // If behind proxy or env has FRONTEND_URL for absolute host, you might switch to that.
  // For local dev we construct from req.protocol + host
  const host = req.get("host");
  const proto = req.protocol;
  return `${proto}://${host}/${relativePath.replace(/\\/g, "/")}`;
};

export const uploadProductMedia = async (req, res) => {
  try {
    const images = [];
    let video = "";

    if (req.files?.images) {
      for (const f of req.files.images) {
        // relative path inside uploads (public)
        const rel = path.relative(path.join(process.cwd(), "server"), f.path);
        // build url
        const publicPath = rel.replace(/\\/g, "/"); // cross-os
        images.push(buildUrl(req, publicPath));
      }
    }

    if (req.files?.video && req.files.video.length > 0) {
      const f = req.files.video[0];
      const rel = path.relative(path.join(process.cwd(), "server"), f.path);
      video = buildUrl(req, rel.replace(/\\/g, "/"));
    }

    return res.status(201).json({ images, video });
  } catch (err) {
    console.error("uploadProductMedia error:", err);
    return res.status(500).json({ message: "Upload failed", error: err.message || String(err) });
  }
};
