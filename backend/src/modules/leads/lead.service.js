const { Op } = require("sequelize");
const Lead = require("./lead.model");
const Activity = require("./activity.model");
const { normPhone } = require("../../core/utils/phoneUtils");
const LEAD_CONSTANTS = require("./lead.constants");

class LeadService {
  static formatLead(lead) {
    if (!lead) return null;
    const plain = lead.toJSON ? lead.toJSON() : lead;
    let tags = [];
    try {
      tags = typeof plain.tags === "string" ? JSON.parse(plain.tags || "[]") : plain.tags || [];
    } catch {
      tags = [];
    }

    const activities = (plain.activities || []).map((act) => ({
      id: act.id,
      type: act.type,
      title: act.title,
      label: act.title || (act.type === "note" ? "Internal Note" : "Activity"),
      detail: act.detail || "",
      metadata: act.metadata ? (typeof act.metadata === "string" ? JSON.parse(act.metadata) : act.metadata) : null,
      createdAt: act.created_at || act.createdAt,
      time: act.created_at || act.createdAt || Date.now(),
    }));

    const calls = (plain.calls || []).map((call) => ({
      id: call.id,
      callId: call.call_id || call.id,
      status: call.status,
      sentiment: call.sentiment,
      outcome: call.outcome,
      callSummary: call.call_summary || call.callSummary || "",
      recordingUrl: call.recording_url || "",
      createdAt: call.created_at || call.createdAt,
    }));

    return {
      id: plain.id,
      name: plain.name,
      phone: plain.phone || "",
      email: plain.email || "",
      company: plain.company || "",
      source: plain.source || "website",
      status: plain.status || "new",
      spaceType: plain.space_type || "",
      seats: plain.seats || "",
      location: plain.location || "",
      duration: plain.duration || "",
      budget: plain.budget || "",
      recommendedCentre: plain.recommended_centre || "",
      notes: plain.notes || "",
      tags: tags,
      aiScore: plain.ai_score !== null && plain.ai_score !== undefined ? plain.ai_score : undefined,
      aiScoreReason: plain.ai_score_reason || "",
      sentiment: plain.sentiment || null,
      requirementsChanged: Boolean(plain.requirements_changed),
      createdAt: plain.created_at || plain.createdAt,
      updatedAt: plain.updated_at || plain.updatedAt,
      assignedToId: plain.assigned_to_id || null,
      assignedToName: plain.assigned_to_name || null,
      assignedToEmail: plain.assigned_to_email || null,
      assignedBy: plain.assigned_by || null,
      assignedAt: plain.assigned_at || null,
      activities: activities,
      calls: calls,
    };
  }

  static async findLeadByIdOrPhone(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();

    let lead = await Lead.findByPk(trimmed);
    if (lead) return lead;

    const norm = normPhone(trimmed);
    const conditions = [{ phone: trimmed }];
    if (norm && norm.length >= 7) {
      conditions.push({ phone: { [Op.like]: `%${norm}` } });
    }

    lead = await Lead.findOne({
      where: {
        [Op.or]: conditions,
      },
    });

    return lead;
  }
}

module.exports = LeadService;
