const { env } = require("../../core/config/env.config");
const { BolnaService } = require("../bolna/bolna.service");
const logger = require("../../core/utils/logger");

class CallService {
  /**
   * Dispatches outbound call request via Bolna AI
   */
  static async createPhoneCall(params) {
    logger.info("Dispatching call via Bolna AI", {
      leadName: params.leadName,
      leadId: params.leadId,
    });

    return await BolnaService.createPhoneCall(params);
  }

  /**
   * Get active provider details & status
   */
  static getProviderDetails() {
    const apiKey = env.BOLNA_API_KEY;
    const agentId = env.BOLNA_AGENT_ID;
    const fromNumber = env.BOLNA_FROM_NUMBER;
    const isConfigured = Boolean(apiKey && agentId && !apiKey.startsWith("your_"));

    return {
      provider: "bolna",
      providerName: "Bolna AI",
      agentId: agentId || "Not set",
      fromNumber: fromNumber || "Default",
      isConfigured,
    };
  }

  static formatCall(call) {
    if (!call) return null;
    const plain = call.toJSON ? call.toJSON() : call;
    return {
      callId: plain.call_id,
      leadId: plain.lead_id || null,
      leadName: plain.lead_name || "",
      phone: plain.phone || "",
      provider: plain.provider || "bolna",
      callType: plain.call_type || "confirm_agent",
      status: plain.status || "initiated",
      sentiment: plain.sentiment || null,
      outcome: plain.outcome || null,
      callbackTime: plain.callback_time || null,
      callbackSchedule: plain.callback_schedule || null,
      callSummary: plain.call_summary || null,
      transcript: plain.transcript || null,
      recordingUrl: plain.recording_url || null,
      location: plain.location || null,
      originalLocation: plain.original_location || null,
      seats: plain.seats || null,
      originalSeats: plain.original_seats || null,
      spaceType: plain.space_type || null,
      originalSpaceType: plain.original_space_type || null,
      recommendedCentre: plain.recommended_centre || null,
      assistantName: plain.assistant_name || null,
      companyName: plain.company_name || null,
      topic: plain.topic || null,
      source: plain.source || null,
      timestamp: plain.created_at || plain.createdAt,
      endedAt: plain.ended_at || null,
      assignedToId: plain.assigned_to_id || null,
      assignedToName: plain.assigned_to_name || null,
      assignedToEmail: plain.assigned_to_email || null,
      assignedBy: plain.assigned_by || null,
      assignedAt: plain.assigned_at || null,
    };
  }
}

module.exports = { CallService };
