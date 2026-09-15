const express = require("express");
const router = express.Router();
const aiController = require("./ai.controller");

router.post("/ai/score", aiController.scoreLeads);
router.post("/ai/email", aiController.generateEmail);
router.post("/ai/insights", aiController.generateInsights);

module.exports = router;
