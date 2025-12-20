const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - during local development allow all origins so the frontend can reach the API
// Configure CORS behavior:
// - If ALLOW_ALL_ORIGINS=true, reflect request origin (allow any origin) which
//   works for dev and keeps credentials safe when not used.
// - Otherwise, use CORS_ORIGIN if provided, or default to * (permissive dev mode).
const allowAll = String(process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true';
let corsOptions;
if (allowAll) {
  // origin: true causes the middleware to set the Access-Control-Allow-Origin
  // header to the request origin. This is more flexible than '*' when credentials
  // might be used in the future.
  corsOptions = { origin: true, optionsSuccessStatus: 200 };
} else if (process.env.CORS_ORIGIN) {
  corsOptions = { origin: process.env.CORS_ORIGIN, optionsSuccessStatus: 200 };
} else {
  corsOptions = { origin: '*', optionsSuccessStatus: 200 };
}

app.use(cors(corsOptions));

// The cors() middleware above handles preflight requests. Avoid registering
// a global app.options() with a wildcard path because some path-to-regexp
// versions will throw on patterns like '*' or '/*'.

console.log(`🔒 CORS configured. ALLOW_ALL_ORIGINS=${allowAll}, CORS_ORIGIN=${process.env.CORS_ORIGIN || '(not set)'})`)
app.use(bodyParser.json())

// Simple request logger to help debug frontend calls
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} Origin:${req.headers.origin || 'none'}`)
  next()
})

// ==========================
// ✅ MongoDB Connection
// ==========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


// ==========================
// ✅ Routes Import
// ==========================
console.log("📌 Loading auth routes...");
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
console.log("📌 Auth routes mounted at /api/auth");

const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu', menuRoutes);
console.log('📌 Menu routes mounted at /api/menu');

const ordersRoutes = require('./routes/ordersRoutes');
app.use('/api/orders', ordersRoutes);
console.log('📌 Orders routes mounted at /api/orders');

const paymentsRoutes = require('./routes/paymentsRoutes');
app.use('/api/payments', paymentsRoutes);
console.log('📌 Payments routes mounted at /api/payments');

// Root test
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// ==========================
// Start Server
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
