const express = require("express");
const router = express.Router();
const WebhookController = require("./webhook.controller");
const { verifyMetaSignature } = require("../../core/middlewares/signatureMiddleware");

router.post("/bolna", WebhookController.handleBolnaEvent);

router.get("/meta", WebhookController.verifyMeta);
router.post(
  "/meta",
  (req, res, next) => {
    if (process.env.META_APP_SECRET && !process.env.META_APP_SECRET.startsWith("your_")) {
      return verifyMetaSignature(req, res, next);
    }
    next();
  },
  WebhookController.handleMetaEvent
);

module.exports = router;
