const express = require("express");
const { login, me } = require("./auth.controller");
const { authenticate } = require("../../core/middlewares/auth.middleware");

const router = express.Router();

router.post("/auth/login", login);
router.get("/auth/me", authenticate, me);

module.exports = router;
