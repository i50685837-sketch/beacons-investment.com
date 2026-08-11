require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");

const app = express();

const PORT = process.env.PORT || 5000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// FRONTEND
// =====================================================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// Homepage
app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});


// =====================================================
// API ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/payment",
  paymentRoutes
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Beacons Investment API"
  });
});


// =====================================================
// 404 API RESPONSE
// =====================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found"
  });
});


// =====================================================
// START SERVER
// =====================================================

async function startServer() {

  try {

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing"
      );
    }

    if (!process.env.AUTH_SECRET) {
      throw new Error(
        "AUTH_SECRET is missing"
      );
    }


    // Connect MongoDB

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "✅ MongoDB Connected"
    );


    // Start Express

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `🚀 Beacons Investment running on port ${PORT}`
        );

      }
    );

  } catch (error) {

    console.error(
      "❌ Server startup failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  }
}


startServer();
