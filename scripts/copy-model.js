// AI model files ko node_modules se public/imgly mein copy karta hai,
// taake model kisi CDN se download na ho aur sab kuch local serve ho.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@imgly", "background-removal-data", "dist");
const dest = path.join(__dirname, "..", "public", "imgly");

if (!fs.existsSync(src)) {
  console.warn("[copy-model] background-removal-data nahi mila, skip.");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[copy-model] Model files public/imgly mein copy ho gayi.");
