const express = require("express");
const router = express.Router();
const salesRepController = require("./salesRep.controller");
const { authenticate, authorizeRoles } = require("../../core/middlewares/auth.middleware");

router.get(
  "/sales-reps",
  authenticate,
  authorizeRoles("super-admin", "admin"),
  salesRepController.getSalesReps
);

module.exports = router;
