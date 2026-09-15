const { Op } = require("sequelize");
const Lead = require("./lead.model");
const Activity = require("./activity.model");
const LeadService = require("./lead.service");
const LEAD_CONSTANTS = require("./lead.constants");
const { formatResponse, handleError } = require("../../core/utils/formatResponse");
const { normPhone } = require("../../core/utils/phoneUtils");
const logger = require("../../core/utils/logger");

const formatLead = LeadService.formatLead;
const findLeadByIdOrPhone = LeadService.findLeadByIdOrPhone;

/**
 * GET /api/leads
 */
const getAllLeads = async (req, res) => {
  try {
    const { Call } = require("../../core/database");
    const { search, status, source, page, limit, assigned_to, sales_rep } = req.query;

    const whereConditions = [];

    // Role-based visibility enforcement
    const userRole = (req.user?.role_name || "").toLowerCase().trim();
    const isSuperAdminOrAdmin = ["super-admin", "admin"].includes(userRole);

    if (!isSuperAdminOrAdmin && req.user?.user_id) {
      // Normal sales reps only see leads assigned to them
      const userConditions = [{ assigned_to_id: req.user.user_id }];
      if (req.user.user_email) {
        userConditions.push({ assigned_to_email: req.user.user_email });
      }
      whereConditions.push({ [Op.or]: userConditions });
    } else {
      // Admins can filter by specific representative or unassigned
      const targetRep = assigned_to || sales_rep;
      if (targetRep && targetRep !== "all") {
        if (targetRep === "unassigned") {
          whereConditions.push({
            [Op.or]: [{ assigned_to_id: null }, { assigned_to_id: "" }],
          });
        } else {
          whereConditions.push({
            [Op.or]: [{ assigned_to_id: targetRep }, { assigned_to_email: targetRep }],
          });
        }
      }
    }

    if (status && status !== "all") {
      whereConditions.push({ status });
    }

    if (source && source !== "all") {
      whereConditions.push({ source });
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { name: { [Op.like]: term } },
          { phone: { [Op.like]: term } },
          { email: { [Op.like]: term } },
          { company: { [Op.like]: term } },
          { location: { [Op.like]: term } },
          { assigned_to_name: { [Op.like]: term } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const include = [{ model: Activity, as: "activities" }];
    if (Call) {
      include.push({ model: Call, as: "calls" });
    }

    const queryOptions = {
      where,
      include,
      order: [["created_at", "DESC"]],
      distinct: true,
    };

    if (isPaginated) {
      queryOptions.limit = limitNum;
      queryOptions.offset = offset;
    }

    const { count, rows } = await Lead.findAndCountAll(queryOptions);
    const formattedRows = rows.map(formatLead);

    if (!isPaginated && req.headers["x-response-format"] !== "hubmanage") {
      return res.status(200).json(formattedRows);
    }

    const data = {
      leads: formattedRows,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      totalRecords: count,
      limit: limitNum,
    };

    const { status: resStatus, response } = formatResponse(
      200,
      true,
      "Leads retrieved successfully",
      "success",
      "Lead records have been retrieved.",
      data
    );

    return res.status(resStatus).json(response);
  } catch (error) {
    logger.error("Error retrieving leads", { error: error.message });
    const { status, response } = handleError(error, "getting leads");
    return res.status(status).json(response);
  }
};

/**
 * GET /api/leads/:id
 */
const getLeadById = async (req, res) => {
  try {
    const { Call } = require("../../core/database");
    const { id } = req.params;
    const lead = await findLeadByIdOrPhone(id);

    if (!lead) {
      const { status, response } = formatResponse(
        404,
        false,
        "Lead not found",
        "error",
        `No lead found with ID or phone '${id}'.`
      );
      return res.status(status).json(response);
    }

    const include = [{ model: Activity, as: "activities" }];
    const order = [[{ model: Activity, as: "activities" }, "created_at", "DESC"]];
    if (Call) {
      include.unshift({ model: Call, as: "calls" });
      order.unshift([{ model: Call, as: "calls" }, "created_at", "DESC"]);
    }

    const fullLead = await Lead.findOne({
      where: { id: lead.id },
      include,
      order,
    });

    const formatted = formatLead(fullLead || lead);
    const { status, response } = formatResponse(200, true, "Lead retrieved", "success", "Lead details retrieved.", formatted);
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "getting lead details");
    return res.status(status).json(response);
  }
};

/**
 * POST /api/leads
 */
const createLead = async (req, res) => {
  try {
    const leadData = req.body || {};
    if (!leadData.name && !leadData.phone) {
      const { status, response } = formatResponse(400, false, "Lead name or phone required", "error", "Please provide a name or phone.");
      return res.status(status).json(response);
    }

    const phone = (leadData.phone || "").trim();
    const norm = normPhone(phone);

    let existingLead = null;
    if (phone && norm) {
      existingLead = await Lead.findOne({
        where: {
          [Op.or]: [
            { phone: phone },
            { phone: { [Op.like]: `%${norm}` } },
          ],
        },
      });
    }

    const rawSource = (leadData.source || "website").toLowerCase().trim();
    const normalizedSource = LEAD_CONSTANTS.SOURCE_MAP[rawSource] || rawSource;

    if (existingLead) {
      await existingLead.update({
        name: leadData.name && leadData.name !== "Unknown" ? leadData.name : existingLead.name,
        email: leadData.email || existingLead.email,
        company: leadData.company || existingLead.company,
        space_type: leadData.spaceType || leadData.space_type || existingLead.space_type,
        seats: leadData.seats ? String(leadData.seats) : existingLead.seats,
        location: leadData.location || existingLead.location,
        recommended_centre: leadData.recommendedCentre || leadData.recommended_centre || existingLead.recommended_centre,
        notes: leadData.notes ? `${existingLead.notes ? existingLead.notes + "\n" : ""}${leadData.notes}` : existingLead.notes,
      });

      const formatted = formatLead(existingLead);
      const { status, response } = formatResponse(200, true, "Lead updated", "success", "Existing lead updated.", { lead: formatted });
      return res.status(status).json(response);
    }

    const id = leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newLead = await Lead.create({
      id,
      name: leadData.name || "Unknown",
      phone: phone || null,
      email: leadData.email || null,
      company: leadData.company || null,
      source: normalizedSource,
      status: leadData.status || "new",
      space_type: leadData.spaceType || leadData.space_type || null,
      seats: leadData.seats ? String(leadData.seats) : null,
      location: leadData.location || null,
      duration: leadData.duration || null,
      budget: leadData.budget || null,
      recommended_centre: leadData.recommendedCentre || leadData.recommended_centre || null,
      notes: leadData.notes || null,
      tags: JSON.stringify(leadData.tags || []),
      ai_score: leadData.aiScore !== undefined ? leadData.aiScore : null,
      ai_score_reason: leadData.aiScoreReason || null,
      sentiment: leadData.sentiment || null,
      requirements_changed: Boolean(leadData.requirementsChanged),
    });

    await Activity.create({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      lead_id: id,
      type: "created",
      title: "Lead Captured",
      detail: `Lead received via ${normalizedSource}${newLead.location ? ` for ${newLead.location}` : ""}${newLead.seats ? ` (${newLead.seats} seats)` : ""}.`,
      metadata: JSON.stringify({ source: normalizedSource }),
    });

    const formatted = formatLead(newLead);
    const { status, response } = formatResponse(201, true, "Lead created", "success", "Lead created successfully.", { lead: formatted, success: true });
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "creating lead");
    return res.status(status).json(response);
  }
};

/**
 * PUT /api/leads/:id
 */
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await findLeadByIdOrPhone(id);

    if (!lead) {
      const { status, response } = formatResponse(404, false, "Lead not found", "error", `No lead found with ID or phone '${id}'.`);
      return res.status(status).json(response);
    }

    const data = req.body || {};
    const updates = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.email !== undefined) updates.email = data.email;
    if (data.company !== undefined) updates.company = data.company;
    if (data.source !== undefined) updates.source = data.source;
    if (data.status !== undefined) updates.status = data.status;
    if (data.spaceType !== undefined || data.space_type !== undefined) updates.space_type = data.spaceType || data.space_type;
    if (data.seats !== undefined) updates.seats = String(data.seats);
    if (data.location !== undefined) updates.location = data.location;
    if (data.duration !== undefined) updates.duration = data.duration;
    if (data.budget !== undefined) updates.budget = data.budget;
    if (data.recommendedCentre !== undefined || data.recommended_centre !== undefined) {
      updates.recommended_centre = data.recommendedCentre || data.recommended_centre;
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.tags !== undefined) updates.tags = typeof data.tags === "string" ? data.tags : JSON.stringify(data.tags);
    if (data.aiScore !== undefined) updates.ai_score = data.aiScore;
    if (data.aiScoreReason !== undefined) updates.ai_score_reason = data.aiScoreReason;
    if (data.sentiment !== undefined) updates.sentiment = data.sentiment;
    if (data.requirementsChanged !== undefined) updates.requirements_changed = Boolean(data.requirementsChanged);

    await lead.update(updates);
    const formatted = formatLead(lead);

    const { status, response } = formatResponse(200, true, "Lead updated", "success", "Lead updated successfully.", { lead: formatted });
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "updating lead");
    return res.status(status).json(response);
  }
};

/**
 * PATCH /api/leads/:id/status
 */
const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, reason } = req.body || {};

    if (!newStatus) {
      const { status, response } = formatResponse(400, false, "Status is required", "error", "Status field is required.");
      return res.status(status).json(response);
    }

    const lead = await findLeadByIdOrPhone(id);

    if (!lead) {
      const { status, response } = formatResponse(404, false, "Lead not found", "error", `No lead found with ID or phone '${id}'.`);
      return res.status(status).json(response);
    }

    const oldStatus = lead.status;
    await lead.update({ status: newStatus });

    if (oldStatus !== newStatus) {
      await Activity.create({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        lead_id: lead.id,
        type: "status_change",
        title: `Status updated: ${oldStatus.toUpperCase()} → ${newStatus.toUpperCase()}`,
        detail: reason || "Status changed in CRM dashboard.",
        metadata: JSON.stringify({ oldStatus, newStatus }),
      });
    }

    const formatted = formatLead(lead);
    const { status, response } = formatResponse(200, true, "Status updated", "success", "Lead status updated.", { lead: formatted });
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "updating lead status");
    return res.status(status).json(response);
  }
};

/**
 * DELETE /api/leads/:id
 */
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await findLeadByIdOrPhone(id);

    if (!lead) {
      const { status, response } = formatResponse(404, false, "Lead not found", "error", `No lead found with ID or phone '${id}'.`);
      return res.status(status).json(response);
    }

    await lead.destroy();
    const { status, response } = formatResponse(200, true, "Lead deleted", "success", "Lead deleted successfully.");
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "deleting lead");
    return res.status(status).json(response);
  }
};

/**
 * GET /api/leads/:id/activities
 */
const getLeadActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await findLeadByIdOrPhone(id);

    if (!lead) {
      const { status, response } = formatResponse(404, false, "Lead not found", "error", `No lead found with ID or phone '${id}'.`);
      return res.status(status).json(response);
    }

    const activities = await Activity.findAll({
      where: { lead_id: lead.id },
      order: [["created_at", "DESC"]],
    });

    const parsed = activities.map((act) => {
      const plain = act.toJSON ? act.toJSON() : act;
      let meta = null;
      try {
        meta = plain.metadata ? JSON.parse(plain.metadata) : null;
      } catch {
        meta = null;
      }
      return {
        id: plain.id,
        leadId: plain.lead_id,
        type: plain.type,
        title: plain.title,
        detail: plain.detail || "",
        metadata: meta,
        createdAt: plain.created_at || plain.createdAt,
      };
    });

    return res.status(200).json(parsed);
  } catch (error) {
    const { status, response } = handleError(error, "getting activities");
    return res.status(status).json(response);
  }
};

/**
 * POST /api/leads/:id/notes
 */
const addLeadNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, author } = req.body || {};

    if (!note || !String(note).trim()) {
      const { status, response } = formatResponse(400, false, "Note is required", "error", "Note text is required in request body.");
      return res.status(status).json(response);
    }

    const lead = await findLeadByIdOrPhone(id);

    if (!lead) {
      const { status, response } = formatResponse(
        404,
        false,
        "Lead not found",
        "error",
        `No lead found with ID or phone '${id}'.`
      );
      return res.status(status).json(response);
    }

    const noteText = String(note).trim();
    const now = new Date();
    const timeStr = now.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const activity = await Activity.create({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      lead_id: lead.id,
      type: "note",
      title: author ? `Note by ${author}` : "Internal Note",
      detail: noteText,
    });

    const currentNotes = lead.notes || "";
    const stampedNote = `[${timeStr}] ${noteText}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${stampedNote}` : stampedNote;
    await lead.update({ notes: updatedNotes });

    const { Call } = require("../../core/database");
    const include = [{ model: Activity, as: "activities" }];
    if (Call) include.unshift({ model: Call, as: "calls" });

    const fullLead = await Lead.findOne({
      where: { id: lead.id },
      include,
      order: [[{ model: Activity, as: "activities" }, "created_at", "DESC"]],
    });

    const formatted = formatLead(fullLead || lead);

    const { status, response } = formatResponse(200, true, "Note added", "success", "Note logged to timeline with timestamp.", { activity, lead: formatted });
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "adding note");
    return res.status(status).json(response);
  }
};

/**
 * POST /api/followup
 */
const recordFollowup = async (req, res) => {
  try {
    const { leadId, phone, name, email, subject, body, type = "email" } = req.body || {};

    if (leadId) {
      await Activity.create({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        lead_id: leadId,
        type: type === "whatsapp" ? "whatsapp" : "email",
        title: type === "whatsapp" ? "WhatsApp Message Sent" : `Email Sent: ${subject || "Follow-up"}`,
        detail: body || `Follow-up ${type} sent to ${email || phone}`,
        metadata: JSON.stringify({ subject, to: email || phone, type }),
      });
    }

    const { status, response } = formatResponse(200, true, "Follow-up logged", "success", `Follow-up recorded for ${name || phone || "lead"}`);
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "logging follow-up");
    return res.status(status).json(response);
  }
};

/**
 * PATCH /api/leads/:id/assign
 * Assigns a lead to a sales representative (Admin / Superadmin only)
 */
const assignLead = async (req, res) => {
  try {
    const userRole = (req.user?.role_name || "").toLowerCase().trim();
    if (userRole !== "admin" && userRole !== "super-admin") {
      return res.status(403).json({
        status: 403,
        success: false,
        message: `Forbidden: Role '${req.user?.role_name}' does not have permission to assign sales representatives.`,
        type: "error",
      });
    }

    const { Call } = require("../../core/database");
    const { id } = req.params;
    const { assigned_to_id, assigned_to_name, assigned_to_email } = req.body;

    const lead = await findLeadByIdOrPhone(id);
    if (!lead) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: `Lead with ID ${id} not found`,
        type: "error",
      });
    }

    const assignedBy = req.user?.name || req.user?.user_email || "Admin";
    const assignedAt = new Date();

    await lead.update({
      assigned_to_id: assigned_to_id || null,
      assigned_to_name: assigned_to_name || null,
      assigned_to_email: assigned_to_email || null,
      assigned_by: assignedBy,
      assigned_at: assignedAt,
    });

    // Record activity
    await Activity.create({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      lead_id: lead.id,
      type: "assignment",
      title: assigned_to_name ? `Assigned to ${assigned_to_name}` : "Assignment Removed",
      detail: assigned_to_name
        ? `Lead assigned to ${assigned_to_name} (${assigned_to_email || "N/A"}) by ${assignedBy}`
        : `Lead assignment cleared by ${assignedBy}`,
      metadata: JSON.stringify({ assigned_to_id, assigned_to_name, assigned_by: assignedBy }),
    });

    // Cascade to associated calls if Call model exists
    if (Call) {
      await Call.update(
        {
          assigned_to_id: assigned_to_id || null,
          assigned_to_name: assigned_to_name || null,
          assigned_to_email: assigned_to_email || null,
          assigned_by: assignedBy,
          assigned_at: assignedAt,
        },
        {
          where: {
            [Op.or]: [{ lead_id: lead.id }, { phone: lead.phone }],
          },
        }
      );
    }

    const include = [{ model: Activity, as: "activities" }];
    if (Call) {
      include.push({ model: Call, as: "calls" });
    }

    const fullLead = await Lead.findByPk(lead.id, {
      include,
      order: [[{ model: Activity, as: "activities" }, "created_at", "DESC"]],
    });

    const formatted = formatLead(fullLead || lead);

    const { status, response } = formatResponse(
      200,
      true,
      "Lead assigned successfully",
      "success",
      assigned_to_name
        ? `Lead has been assigned to ${assigned_to_name}.`
        : "Lead assignment has been cleared.",
      formatted
    );

    return res.status(status).json(response);
  } catch (error) {
    logger.error("Error assigning lead", { error: error.message });
    const { status, response } = handleError(error, "assigning lead");
    return res.status(status).json(response);
  }
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadActivities,
  addLeadNote,
  recordFollowup,
  assignLead,
};
