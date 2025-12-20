const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const path = require('path');
const fs = require('fs');

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

// Serve frontend static files when a build is present (useful for single-repo deployments)
// This will let SPA routes like /admin-panel return the frontend's index.html instead of 404.
try {
  const clientBuildPath = path.join(__dirname, '..', 'Frontend', 'dist');
  if (fs.existsSync(clientBuildPath)) {
    console.log(`📦 Serving frontend from ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));

    // Serve index.html for any non-API GET request (SPA fallback)
    // Avoid registering a route pattern (like '*' or '/*') which can throw
    // on some path-to-regexp versions. Instead use a middleware that checks
    // the request and serves index.html when appropriate.
    app.use((req, res, next) => {
      try {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api')) return next();
        // If the request accepts HTML, return the SPA entrypoint
        const accepts = req.headers.accept || '';
        if (accepts.indexOf('text/html') === -1 && accepts.indexOf('*/*') === -1) return next();
        return res.sendFile(path.join(clientBuildPath, 'index.html'));
      } catch (e) {
        console.error('Error in SPA fallback middleware:', e);
        return next(e);
      }
    });
  }
} catch (err) {
  console.error('Error while configuring static frontend serving:', err);
}

// ==========================
// Start Server
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
