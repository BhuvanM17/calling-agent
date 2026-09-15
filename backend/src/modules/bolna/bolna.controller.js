const { BolnaService } = require("./bolna.service");
const { formatResponse, handleError } = require("../../core/utils/formatResponse");
const logger = require("../../core/utils/logger");

class BolnaController {
  /**
   * POST /api/bolna/trigger-call
   */
  static async triggerCall(req, res) {
    try {
      const { toNumber, leadName, leadId, customFields, source } = req.body || {};
      if (!toNumber) {
        const { status, response } = formatResponse(400, false, "Recipient phone number required", "error", "Phone number is required.");
        return res.status(status).json(response);
      }

      const result = await BolnaService.createPhoneCall({ toNumber, leadName, leadId, customFields, source });
      const { status, response } = formatResponse(200, true, "Bolna call triggered", "success", "Call initiated via Bolna AI", result);
      return res.status(status).json(response);
    } catch (error) {
      logger.error("Bolna call trigger error", { error: error.message });
      const { status, response } = handleError(error, "triggering Bolna call");
      return res.status(status).json(response);
    }
  }

  /**
   * GET /api/bolna/agent
   */
  static async getAgent(req, res) {
    try {
      const agentId = req.query.agentId;
      const config = await BolnaService.getAgentConfig(agentId);
      const { status, response } = formatResponse(200, true, "Bolna agent fetched", "success", "Agent config retrieved", config);
      return res.status(status).json(response);
    } catch (error) {
      const { status, response } = handleError(error, "fetching Bolna agent config");
      return res.status(status).json(response);
    }
  }
}

module.exports = BolnaController;
