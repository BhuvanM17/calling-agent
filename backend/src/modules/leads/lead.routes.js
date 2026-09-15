const express = require("express");
const router = express.Router();
const leadController = require("./lead.controller");
const { authenticate, authorizeRoles } = require("../../core/middlewares/auth.middleware");

router.get("/leads", authenticate, leadController.getAllLeads);
router.get("/leads/:id", authenticate, leadController.getLeadById);
router.post("/leads", authenticate, leadController.createLead);
router.put("/leads/:id", authenticate, leadController.updateLead);
router.patch("/leads/:id/assign", authenticate, authorizeRoles("super-admin", "admin"), leadController.assignLead);
router.patch("/leads/:id/status", authenticate, leadController.updateLeadStatus);
router.delete("/leads/:id", authenticate, authorizeRoles("super-admin", "admin"), leadController.deleteLead);

router.get("/leads/:id/activities", authenticate, leadController.getLeadActivities);
router.post("/leads/:id/notes", authenticate, leadController.addLeadNote);
router.post("/followup", authenticate, leadController.recordFollowup);

module.exports = router;

