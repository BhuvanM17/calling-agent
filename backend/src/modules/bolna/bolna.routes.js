const express = require("express");
const router = express.Router();
const BolnaController = require("./bolna.controller");

router.post("/bolna/trigger-call", BolnaController.triggerCall);
router.get("/bolna/agent", BolnaController.getAgent);

module.exports = router;
