const express = require("express");
const { leadRoutes } = require("./modules/leads");
const { callRoutes } = require("./modules/calls");
const { statsRoutes } = require("./modules/stats");
const { aiRoutes } = require("./modules/ai");
const { bolnaRoutes } = require("./modules/bolna");
const { salesRepRoutes } = require("./modules/users");
const { authRoutes } = require("./modules/auth");

const mainRouter = express.Router();

const moduleRoutes = [
  authRoutes,
  leadRoutes,
  callRoutes,
  statsRoutes,
  aiRoutes,
  bolnaRoutes,
  salesRepRoutes,
];

moduleRoutes.forEach((route) => {
  if (route) {
    mainRouter.use(route);
  }
});

module.exports = mainRouter;
