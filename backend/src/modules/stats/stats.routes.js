const express = require("express");
const router = express.Router();
const statsController = require("./stats.controller");
const { authenticate } = require("../../core/middlewares/auth.middleware");

router.get("/stats", authenticate, statsController.getStats);

module.exports = router;
