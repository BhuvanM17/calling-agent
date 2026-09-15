const express = require("express");
const router = express.Router();
const callController = require("./call.controller");
const { authenticate, authorizeRoles } = require("../../core/middlewares/auth.middleware");

router.get(["/calls", "/logs"], authenticate, callController.getAllCalls);
router.get("/calls/:id", authenticate, callController.getCallById);
router.put("/calls/:id", authenticate, callController.updateCall);
router.patch("/calls/:id", authenticate, callController.updateCall);
router.patch("/calls/:id/assign", authenticate, authorizeRoles("super-admin", "admin"), callController.assignCall);
router.post("/simulate-call", authenticate, callController.simulateCall);
router.post("/test-call", authenticate, callController.triggerTestCall);

module.exports = router;

