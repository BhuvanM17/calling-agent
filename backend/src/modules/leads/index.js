const LEAD_CONSTANTS = require("./lead.constants");
const Lead = require("./lead.model");
const Activity = require("./activity.model");
const LeadService = require("./lead.service");
const leadController = require("./lead.controller");
const leadRoutes = require("./lead.routes");

module.exports = {
  LEAD_CONSTANTS,
  Lead,
  Activity,
  LeadService,
  leadController,
  leadRoutes,
};
