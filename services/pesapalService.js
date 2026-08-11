require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Beacons Investment API"
  });
});

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log("🚀 Beacons Investment API running");
  });
});
