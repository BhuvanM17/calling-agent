const { env } = require("../../core/config/env.config");
const logger = require("../../core/utils/logger");
const META_CONSTANTS = require("./meta.constants");

class MetaService {
  /**
   * Fetches full lead payload from Meta Graph API
   */
  static async getLeadData(leadgenId) {
    const url = META_CONSTANTS.LEAD_ENDPOINT(leadgenId, env.META_PAGE_ACCESS_TOKEN);
    logger.info(`Fetching Meta lead data for leadgen_id: ${leadgenId}`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      logger.error("Failed to fetch lead from Meta Graph API", { leadgenId, data });
      throw new Error(`Meta API error: ${data.error?.message || response.statusText}`);
    }

    const fields = Object.fromEntries(
      (data.field_data || []).map((f) => [f.name, f.values ? f.values[0] : null])
    );

    const phone = fields.phone_number || fields.phone || fields.user_phone_number || null;
    const name = fields.full_name || fields.first_name || fields.name || "there";

    return {
      leadgenId,
      phone,
      name,
      fields,
      rawData: data,
    };
  }
}

module.exports = { MetaService };
