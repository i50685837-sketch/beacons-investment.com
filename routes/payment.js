// routes/payment.js

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();


// =====================================================
// PESAPAL CONFIGURATION
// =====================================================

const PESAPAL_ENVIRONMENT =
  process.env.PESAPAL_ENVIRONMENT || "sandbox";

const PESAPAL_BASE_URL =
  PESAPAL_ENVIRONMENT === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

const PESAPAL_CONSUMER_KEY =
  process.env.PESAPAL_CONSUMER_KEY;

const PESAPAL_CONSUMER_SECRET =
  process.env.PESAPAL_CONSUMER_SECRET;


// =====================================================
// GET PESAPAL AUTH TOKEN
// =====================================================

async function getPesapalToken() {
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw new Error(
      "Pesapal credentials are missing from .env"
    );
  }

  const response = await axios.post(
    `${PESAPAL_BASE_URL}/api/Auth/RequestToken`,
    {
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.data?.token) {
    throw new Error(
      "Pesapal did not return an authentication token"
    );
  }

  return response.data.token;
}


// =====================================================
// CREATE PAYMENT ORDER
// =====================================================

router.post("/deposit", auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Enter a valid deposit amount."
      });
    }

    if (amount < 750) {
      return res.status(400).json({
        message: "Minimum deposit is KES 750."
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const token = await getPesapalToken();

    const merchantReference =
      `BEACONS-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const order = {
      id: merchantReference,

      currency: "KES",

      amount: amount,

      description: "Beacons Investment Deposit",

      callback_url:
        process.env.PESAPAL_CALLBACK_URL,

      notification_id:
        process.env.PESAPAL_IPN_ID,

      billing_address: {
        email_address: user.email,

        phone_number: user.phone,

        country_code: "KE",

        first_name:
          user.name?.split(" ")[0] || "User",

        last_name:
          user.name?.split(" ").slice(1).join(" ") || "Beacons"
      }
    };

    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
      order,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      message: "Payment request created.",
      merchantReference,
      orderTrackingId:
        response.data?.order_tracking_id || null,
      redirectUrl:
        response.data?.redirect_url || null,
      status:
        response.data?.status || null
    });

  } catch (error) {

    console.error(
      "PESAPAL DEPOSIT ERROR:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Unable to create payment request."
    });
  }
});


// =====================================================
// CHECK PAYMENT STATUS
// =====================================================

router.get(
  "/status/:trackingId",
  auth,
  async (req, res) => {

    try {

      const trackingId =
        req.params.trackingId;

      if (!trackingId) {
        return res.status(400).json({
          message: "Tracking ID is required."
        });
      }

      const token =
        await getPesapalToken();

      const response = await axios.get(
        `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      res.json({
        payment: response.data
      });

    } catch (error) {

      console.error(
        "PAYMENT STATUS ERROR:",
        error.response?.data || error.message
      );

      res.status(500).json({
        message: "Unable to check payment status."
      });
    }
  }
);


// =====================================================
// PESAPAL CALLBACK
// =====================================================

router.get("/callback", async (req, res) => {

  try {

    const trackingId =
      req.query.OrderTrackingId;

    const merchantReference =
      req.query.OrderMerchantReference;

    console.log(
      "Pesapal callback:",
      {
        trackingId,
        merchantReference
      }
    );

    /*
      IMPORTANT:

      Do not immediately add money to the user's
      balance just because the browser reached
      this callback.

      Your backend should verify the transaction
      status with Pesapal first.
    */

    res.redirect(
      "/payment-success.html"
    );

  } catch (error) {

    console.error(
      "CALLBACK ERROR:",
      error.message
    );

    res.status(500).send(
      "Payment callback error."
    );
  }
});


// =====================================================
// PESAPAL IPN
// =====================================================

router.post("/ipn", async (req, res) => {

  try {

    const {
      OrderTrackingId,
      OrderMerchantReference
    } = req.body;

    console.log(
      "Pesapal IPN received:",
      {
        OrderTrackingId,
        OrderMerchantReference
      }
    );

    /*
      This endpoint should:

      1. Receive the Pesapal notification.
      2. Verify the transaction with Pesapal.
      3. Confirm the transaction is COMPLETED.
      4. Find the corresponding user/payment.
      5. Credit the user's balance ONCE.
      6. Record the transaction.

      Do not credit the balance from the frontend.
    */

    res.json({
      orderNotificationType:
        "IPNCHANGE",
      orderTrackingId:
        OrderTrackingId,
      orderMerchantReference:
        OrderMerchantReference
    });

  } catch (error) {

    console.error(
      "IPN ERROR:",
      error.message
    );

    res.status(500).json({
      message: "IPN processing failed."
    });
  }
});


module.exports = router;
