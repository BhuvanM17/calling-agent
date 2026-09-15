const { env } = require("../../core/config/env.config");
const logger = require("../../core/utils/logger");
const { normalizeToE164 } = require("../../core/utils/phoneUtils");
const BOLNA_CONSTANTS = require("./bolna.constants");

class BolnaService {
  /**
   * Triggers outbound call via Bolna AI API (https://api.bolna.dev/call)
   */
  static async createPhoneCall({ toNumber, leadName, leadId, customFields = {}, source = "instagram_lead_ad" }) {
    const formattedPhone = normalizeToE164(toNumber);

    if (!formattedPhone) {
      logger.error("Cannot create Bolna AI call: Invalid phone number", { toNumber, leadId });
      throw new Error(`Invalid phone number provided: ${toNumber}`);
    }

    logger.info(`Initiating Bolna AI outbound call to ${formattedPhone}`, {
      leadId,
      leadName,
      agentId: env.BOLNA_AGENT_ID,
    });

    const firstName = leadName ? leadName.trim().split(" ")[0] : "there";
    const location = customFields.location || customFields.city || "";
    const seats = customFields.seats || customFields.number_of_seats || "";
    const workspaceType =
      customFields.workspaceType ||
      customFields.workspace_type ||
      "";

    const payload = {
      agent_id: env.BOLNA_AGENT_ID,
      recipient_phone_number: formattedPhone,

      user_data: {
        ...customFields,
        name: leadName,
        first_name: firstName,
        location: location,
        workspace_type: workspaceType,
        seats: seats,
        lead_id: leadId,
        source: source,
      },
    };

    if (customFields.welcome_message) {
      payload.welcome_message = customFields.welcome_message;
    }

    if (env.BOLNA_FROM_NUMBER) {
      payload.from_phone_number = env.BOLNA_FROM_NUMBER;
    }

    logger.info("Sending Bolna AI payload", { payload });

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.BOLNA_API_KEY}`,
      "X-Api-Key": env.BOLNA_API_KEY,
    };

    const response = await fetch(BOLNA_CONSTANTS.ENDPOINTS.CALL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      logger.error("Bolna AI API call creation failed", {
        status: response.status,
        data,
      });
      const errorMsg = data.message || data.detail || data.error || response.statusText;
      const hint = response.status === 401 || response.status === 403
        ? " (Check that BOLNA_API_KEY in .env is valid)"
        : response.status === 404
        ? " (Check that BOLNA_AGENT_ID in .env exists in your Bolna dashboard)"
        : "";
      throw new Error(`Bolna AI error (${response.status}): ${errorMsg}${hint}`);
    }

    const callId = data.agent_execution_id || data.execution_id || data.call_id || data.id || `bolna_${Date.now()}`;
    logger.info("Bolna AI outbound call created successfully", { callId, leadId, responseData: data });

    // Persist to database if Call model is available
    try {
      const { Call } = require("../../core/database");
      if (Call) {
        await Call.create({
          call_id: callId,
          lead_id: leadId || null,
          lead_name: leadName || "Unknown",
          phone: formattedPhone,
          source,
          provider: "bolna",
          location: location || null,
          original_location: location || null,
          seats: seats ? String(seats) : null,
          original_seats: seats ? String(seats) : null,
          space_type: workspaceType || null,
          original_space_type: workspaceType || null,
          status: "initiated",
          created_at: new Date(),
        });
      }
    } catch (dbErr) {
      logger.error("Failed to save initial call to database", { error: dbErr.message, callId });
    }

    return {
      success: true,
      call_id: callId,
      provider: "bolna",
      raw: data,
    };
  }

  /**
   * Fetches agent configuration from Bolna API
   */
  static async getAgentConfig(agentId = env.BOLNA_AGENT_ID) {
    const headers = {
      Authorization: `Bearer ${env.BOLNA_API_KEY}`,
      "X-Api-Key": env.BOLNA_API_KEY,
      "Content-Type": "application/json",
    };

    const res = await fetch(BOLNA_CONSTANTS.ENDPOINTS.AGENT(agentId), { headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch agent details (${res.status}): ${errorText}`);
    }
    return await res.json();
  }

  /**
   * Updates agent configuration on Bolna API
   */
  static async updateAgentConfig(agentId = env.BOLNA_AGENT_ID, agentData) {
    const headers = {
      Authorization: `Bearer ${env.BOLNA_API_KEY}`,
      "X-Api-Key": env.BOLNA_API_KEY,
      "Content-Type": "application/json",
    };

    const res = await fetch(BOLNA_CONSTANTS.ENDPOINTS.AGENT(agentId), {
      method: "PUT",
      headers,
      body: JSON.stringify(agentData),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Agent update failed (${res.status}): ${errText}`);
    }
    return await res.json().catch(() => ({}));
  }
}

module.exports = { BolnaService };
