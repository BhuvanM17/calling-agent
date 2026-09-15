const { AIService } = require("./ai.service");
const { formatResponse, handleError } = require("../../core/utils/formatResponse");
const logger = require("../../core/utils/logger");

const scoreLeads = async (req, res) => {
  try {
    const { leads = [] } = req.body || {};
    const scores = await AIService.scoreLeads(leads);
    const { status, response } = formatResponse(200, true, "Leads scored", "success", "AI Lead scores generated.", { scores });
    return res.status(status).json(response);
  } catch (error) {
    logger.error("AI scoring failed", { error: error.message });
    const { status, response } = handleError(error, "scoring leads");
    return res.status(status).json(response);
  }
};

const generateEmail = async (req, res) => {
  try {
    const result = await AIService.generateEmail(req.body || {});
    const { status, response } = formatResponse(200, true, "Email generated", "success", "AI email generated.", result);
    return res.status(status).json(response);
  } catch (error) {
    logger.error("AI email generation failed", { error: error.message });
    const { status, response } = handleError(error, "generating email");
    return res.status(status).json(response);
  }
};

const generateInsights = async (req, res) => {
  try {
    const { summary } = req.body || {};
    const insights = await AIService.generateInsights(summary || {});
    const { status, response } = formatResponse(200, true, "Insights generated", "success", "AI insights generated.", { insights });
    return res.status(status).json(response);
  } catch (error) {
    logger.error("AI insights generation failed", { error: error.message });
    const { status, response } = handleError(error, "generating insights");
    return res.status(status).json(response);
  }
};

module.exports = {
  scoreLeads,
  generateEmail,
  generateInsights,
};
