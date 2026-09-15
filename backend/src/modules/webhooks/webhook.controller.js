const { Op } = require("sequelize");
const { Call, Lead, Activity } = require("../../core/database");
const { env } = require("../../core/config/env.config");
const { MetaService } = require("../meta/meta.service");
const { CallService } = require("../calls/call.service");
const {
  extractTranscript,
  extractSummary,
  analyzeCallSentiment,
  extractCallbackInfo,
  deriveCallOutcome,
} = require("../../core/utils/sentimentUtils");
const { normPhone } = require("../../core/utils/phoneUtils");
const logger = require("../../core/utils/logger");

class WebhookController {
  /**
   * POST /webhooks/bolna
   * Handles Bolna AI call events.
   */
  static async handleBolnaEvent(req, res) {
    res.sendStatus(200);

    try {
      const payload = req.body || {};
      logger.info("Bolna AI webhook event received", { payloadKeys: Object.keys(payload) });

      const callId =
        payload.agent_execution_id ||
        payload.execution_id ||
        payload.call_id ||
        payload.id ||
        payload.user_data?.lead_id;

      if (!callId) {
        logger.warn("Bolna webhook missing call_id/execution_id", { payload });
        return;
      }

      const rawStatus = (payload.status || payload.execution_status || payload.telephony_data?.status || "completed").toLowerCase();
      const callStatus =
        rawStatus.includes("failed") || rawStatus.includes("error") || rawStatus.includes("no-answer") || rawStatus.includes("busy")
          ? "failed"
          : "completed";

      const transcript = extractTranscript(payload);
      let callSummary = extractSummary(payload);
      if (!callSummary && transcript) {
        callSummary = transcript;
      } else if (!callSummary && payload.extracted_data) {
        callSummary = typeof payload.extracted_data === "object" ? JSON.stringify(payload.extracted_data, null, 2) : String(payload.extracted_data);
      }

      const rawSentiment =
        payload.sentiment ||
        payload.user_sentiment ||
        payload.analysis?.sentiment ||
        payload.extracted_data?.sentiment ||
        payload.agent_extraction?.sentiment ||
        payload.custom_extractions?.sentiment ||
        payload.smart_status ||
        null;

      const ext = payload.extracted_data || payload.agent_extraction || payload.custom_extractions || payload.user_data || {};

      const sentiment = analyzeCallSentiment({
        summary: callSummary,
        transcript,
        extractedData: ext,
        rawSentiment,
      });

      const { isCallbackRequested, callbackTime } = extractCallbackInfo({
        summary: callSummary,
        transcript,
        payload,
      });

      const outcome = deriveCallOutcome({
        summary: callSummary,
        transcript,
        callStatus,
        isCallbackRequested,
      });

      const assistantName = payload.assistant_name || payload.agent_name || payload.user_data?.assistant_name || env.ASSISTANT_NAME || null;
      const companyName = payload.company_name || payload.user_data?.company_name || env.COMPANY_NAME || null;
      const topic = payload.topic || payload.user_data?.topic || null;

      const loc = ext.location || ext.updated_location || ext.location_preference || payload.user_data?.location || null;
      const st = ext.seats || ext.updated_seats || ext.seat_count || payload.user_data?.seats || null;
      const sp = ext.space_type || ext.workspace_type || ext.updated_space_type || payload.user_data?.workspace_type || null;
      const centre = ext.recommended_centre || ext.centre || ext.recommended_center || null;

      let call = await Call.findOne({
        where: {
          [Op.or]: [
            { call_id: callId },
            { call_id: { [Op.like]: `%${callId}%` } },
          ],
        },
      });

      const updateData = {
        status: callStatus,
        sentiment,
        call_summary: callSummary ? String(callSummary).slice(0, 3000) : null,
        transcript: transcript ? String(transcript).slice(0, 5000) : null,
        outcome,
        callback_time: callbackTime,
        ended_at: new Date(),
      };

      if (loc) { updateData.location = loc; updateData.original_location = loc; }
      if (st) { updateData.seats = String(st); updateData.original_seats = String(st); }
      if (sp) { updateData.space_type = sp; updateData.original_space_type = sp; }
      if (centre) updateData.recommended_centre = centre;
      if (assistantName) updateData.assistant_name = assistantName;
      if (companyName) updateData.company_name = companyName;
      if (topic) updateData.topic = topic;

      if (call) {
        await call.update(updateData);
      } else {
        call = await Call.create({
          call_id: callId,
          ...updateData,
        });
      }

      let leadId = call.lead_id;
      if (!leadId && call.phone) {
        const norm = normPhone(call.phone);
        const matchedLead = await Lead.findOne({
          where: {
            [Op.or]: [
              { phone: call.phone },
              { phone: { [Op.like]: `%${norm}` } },
            ],
          },
        });
        if (matchedLead) {
          leadId = matchedLead.id;
          await call.update({ lead_id: leadId });
        }
      }

      if (leadId) {
        const lead = await Lead.findByPk(leadId);
        if (lead) {
          const reqChanged =
            (st && lead.seats && String(st) !== String(lead.seats)) ||
            (loc && lead.location && loc !== lead.location);

          await lead.update({
            sentiment: sentiment || lead.sentiment,
            requirements_changed: reqChanged || lead.requirements_changed,
            location: loc || lead.location,
            seats: st ? String(st) : lead.seats,
            space_type: sp || lead.space_type,
            recommended_centre: centre || lead.recommended_centre,
          });

          await Activity.create({
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            lead_id: leadId,
            type: "call",
            title: `AI Call ${callStatus.toUpperCase()} · ${sentiment || "Neutral"} sentiment`,
            detail: outcome
              ? `Outcome: ${outcome}. Summary: ${callSummary ? callSummary.slice(0, 150) + "..." : "No summary"}`
              : (callSummary ? callSummary.slice(0, 200) : "Call ended."),
            metadata: JSON.stringify({ callId, status: callStatus, sentiment, outcome, callbackTime }),
          });
        }
      }

      logger.info("Bolna webhook successfully processed for call", { callId, sentiment, outcome });
    } catch (err) {
      logger.error("Error processing Bolna AI webhook", { error: err.message });
    }
  }

  /**
   * GET /webhooks/meta (Verification)
   */
  static verifyMeta(req, res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === env.META_VERIFY_TOKEN) {
      logger.info("Meta webhook verification successful");
      return res.status(200).send(challenge);
    }

    logger.warn("Meta webhook verification failed", { mode });
    return res.sendStatus(403);
  }

  /**
   * POST /webhooks/meta (Lead intake)
   */
  static async handleMetaEvent(req, res) {
    res.sendStatus(200);

    try {
      const entries = req.body?.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "leadgen") {
            const leadgenId = change.value?.leadgen_id;
            if (leadgenId) {
              WebhookController.processMetaLead(leadgenId).catch((err) => {
                logger.error("Background Meta lead processing error", { leadgenId, error: err.message });
              });
            }
          }
        }
      }
    } catch (err) {
      logger.error("Error handling Meta webhook", { error: err.message });
    }
  }

  static async processMetaLead(leadgenId) {
    const leadData = await MetaService.getLeadData(leadgenId);
    if (!leadData.phone) {
      logger.warn(`Lead ${leadgenId} has no phone, skipping outbound call.`);
      return;
    }

    const norm = normPhone(leadData.phone);
    let lead = await Lead.findOne({
      where: {
        [Op.or]: [
          { phone: leadData.phone },
          { phone: { [Op.like]: `%${norm}` } },
        ],
      },
    });

    if (!lead) {
      lead = await Lead.create({
        id: leadData.leadgenId || `ig_${Date.now()}`,
        name: leadData.name || "Instagram Lead",
        phone: leadData.phone,
        email: leadData.email || "",
        company: leadData.fields?.company || "",
        source: "instagram",
        location: leadData.fields?.location || leadData.fields?.city || "",
        space_type: leadData.fields?.workspace_type || leadData.fields?.space_type || "",
        seats: leadData.fields?.seats ? String(leadData.fields.seats) : "",
        status: "new",
        notes: "Captured via Instagram Lead Ad",
      });
    }

    // Deduplication check: Avoid re-calling if an active or completed call already exists
    const existingCall = await Call.findOne({
      where: {
        [Op.or]: [
          ...(lead?.id ? [{ lead_id: lead.id }] : []),
          { phone: leadData.phone },
          { phone: { [Op.like]: `%${norm}` } },
        ],
        status: {
          [Op.in]: ["completed", "in-progress", "initiated"],
        },
      },
      order: [["created_at", "DESC"]],
    });

    if (existingCall) {
      logger.info(
        `Skipping automatic outbound call for lead ${lead.id} (${leadData.phone}): ` +
        `Existing call [${existingCall.call_id}] has status '${existingCall.status}'.`
      );
      return;
    }

    await CallService.createPhoneCall({
      toNumber: leadData.phone,
      leadName: leadData.name,
      leadId: lead.id,
      customFields: leadData.fields,
      source: "instagram_lead_ad",
    });
  }
}

module.exports = WebhookController;
