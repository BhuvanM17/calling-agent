const { Op } = require("sequelize");
const Call = require("./call.model");
const { CallService } = require("./call.service");
const { formatResponse, handleError } = require("../../core/utils/formatResponse");
const { normPhone } = require("../../core/utils/phoneUtils");
const logger = require("../../core/utils/logger");

const formatCall = CallService.formatCall;

const getAllCalls = async (req, res) => {
  try {
    const { page, limit, sentiment, status, provider, search, assigned_to, sales_rep } = req.query;

    const whereConditions = [];

    // Role-based visibility enforcement
    const userRole = (req.user?.role_name || "").toLowerCase().trim();
    const isSuperAdminOrAdmin = ["super-admin", "admin"].includes(userRole);

    if (!isSuperAdminOrAdmin && req.user?.user_id) {
      // Normal sales reps only see calls assigned to them
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

    if (sentiment && sentiment !== "all") {
      whereConditions.push({ sentiment });
    }

    if (status && status !== "all") {
      whereConditions.push({ status });
    }

    if (provider && provider !== "all") {
      whereConditions.push({ provider });
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { lead_name: { [Op.like]: term } },
          { phone: { [Op.like]: term } },
          { call_summary: { [Op.like]: term } },
          { location: { [Op.like]: term } },
          { assigned_to_name: { [Op.like]: term } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const queryOptions = {
      where,
      order: [["created_at", "DESC"]],
    };

    if (isPaginated) {
      queryOptions.limit = limitNum;
      queryOptions.offset = offset;
    }

    const { count, rows } = await Call.findAndCountAll(queryOptions);
    const formattedRows = rows.map(formatCall);

    if (!isPaginated && req.headers["x-response-format"] !== "hubmanage") {
      return res.status(200).json(formattedRows);
    }

    const data = {
      calls: formattedRows,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      totalRecords: count,
      limit: limitNum,
    };

    const { status: resStatus, response } = formatResponse(
      200,
      true,
      "Calls retrieved successfully",
      "success",
      "Call records have been retrieved.",
      data
    );

    return res.status(resStatus).json(response);
  } catch (error) {
    logger.error("Error retrieving calls", { error: error.message });
    const { status, response } = handleError(error, "getting calls");
    return res.status(status).json(response);
  }
};

/**
 * GET /api/calls/:id
 */
const getCallById = async (req, res) => {
  try {
    const { Lead } = require("../../core/database");
    const { id } = req.params;
    const include = [];
    if (Lead) {
      include.push({ model: Lead, as: "lead" });
    }

    const call = await Call.findOne({
      where: {
        [Op.or]: [
          { call_id: id },
          { call_id: { [Op.like]: `%${id}%` } },
        ],
      },
      include,
    });

    if (!call) {
      const { status, response } = formatResponse(404, false, "Call not found", "error", "Call record not found.");
      return res.status(status).json(response);
    }

    const formatted = formatCall(call);
    const { status, response } = formatResponse(200, true, "Call retrieved", "success", "Call details retrieved.", formatted);
    return res.status(status).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "getting call details");
    return res.status(status).json(response);
  }
};

/**
 * POST /api/simulate-call
 */
const simulateCall = async (req, res) => {
  try {
    const { Lead, Activity } = require("../../core/database");

    const {
      leadName = "Sample Lead",
      phone = "+91 9876543210",
      assistantName = null,
      companyName = null,
      topic = null,
      callSummary = null,
      outcome = "Call Completed",
      callbackTime = null,
      sentiment = "Neutral",
      status = "completed",
      source = "manual_simulation",
      location = null,
      seats = null,
      spaceType = null,
    } = req.body || {};

    const callId = `sim_${Date.now()}`;
    const norm = normPhone(phone);

    let lead = null;
    if (Lead && phone && norm) {
      lead = await Lead.findOne({
        where: {
          [Op.or]: [
            { phone: phone },
            { phone: { [Op.like]: `%${norm}` } },
          ],
        },
      });
    }

    const createdCall = await Call.create({
      call_id: callId,
      lead_id: lead ? lead.id : null,
      lead_name: leadName,
      phone,
      source,
      provider: CallService.getProviderDetails().provider || "bolna",
      assistant_name: assistantName,
      company_name: companyName,
      topic,
      outcome,
      callback_time: callbackTime,
      status,
      sentiment,
      call_summary: callSummary,
      location,
      original_location: location,
      seats: seats ? String(seats) : null,
      original_seats: seats ? String(seats) : null,
      space_type: spaceType,
      original_space_type: spaceType,
      ended_at: new Date(),
    });

    if (lead && Activity) {
      await Activity.create({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        lead_id: lead.id,
        type: "call",
        title: `Simulated Call · ${sentiment}`,
        detail: outcome || "Simulation call recorded",
        metadata: JSON.stringify({ callId, status, sentiment, outcome, callbackTime }),
      });
    }

    const formatted = formatCall(createdCall);
    const { status: resStatus, response } = formatResponse(
      200,
      true,
      "Simulated call created",
      "success",
      `Simulated call created for ${leadName}`,
      { callId, call: formatted }
    );
    return res.status(resStatus).json(response);
  } catch (error) {
    const { status, response } = handleError(error, "simulating call");
    return res.status(status).json(response);
  }
};

/**
 * POST /api/test-call
 */
const triggerTestCall = async (req, res) => {
  try {
    const { Lead, Activity } = require("../../core/database");

    const { name, phone, location, seats, workspaceType, callType, callbackSchedule } = req.body || {};

    if (!name || !phone) {
      const { status, response } = formatResponse(400, false, "Name and phone are required", "error", "Please provide name and phone.");
      return res.status(status).json(response);
    }

    const providerDetails = CallService.getProviderDetails();
    logger.info(`Manual test call triggered from dashboard via ${providerDetails.providerName}`, {
      name,
      phone,
      callType,
      location,
      seats,
      workspaceType,
    });

    const norm = normPhone(phone);
    let lead = null;
    if (Lead) {
      lead = await Lead.findOne({
        where: {
          [Op.or]: [
            { phone: phone },
            { phone: { [Op.like]: `%${norm}` } },
          ],
        },
      });

      if (!lead) {
        const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        lead = await Lead.create({
          id: leadId,
          name,
          phone,
          location,
          seats: seats ? String(seats) : null,
          space_type: workspaceType,
          source: "call",
          status: "contacted",
        });
      } else {
        await lead.update({ status: "contacted" });
      }
    }

    const leadId = lead ? lead.id : null;
    const result = await CallService.createPhoneCall({
      toNumber: phone,
      leadName: name,
      customFields: {
        location,
        seats,
        workspaceType,
        callType: callType || "confirm_agent",
        callbackSchedule: callbackSchedule || null,
      },
      leadId,
      source: "call",
    });

    const callId = result.call_id || result.callId || `call_${Date.now()}`;

    const existingCall = await Call.findByPk(callId);
    if (!existingCall) {
      await Call.create({
        call_id: callId,
        lead_id: leadId,
        lead_name: name,
        phone,
        provider: providerDetails.provider || "bolna",
        call_type: callType || "confirm_agent",
        status: "initiated",
        location,
        original_location: location,
        seats: seats ? String(seats) : null,
        original_seats: seats ? String(seats) : null,
        space_type: workspaceType,
        original_space_type: workspaceType,
        callback_schedule: callbackSchedule || null,
      });
    }

    if (leadId && Activity) {
      await Activity.create({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        lead_id: leadId,
        type: "call",
        title: `Outbound AI Call Initiated (${providerDetails.providerName})`,
        detail: `Call placed to ${phone}. Status: initiated`,
        metadata: JSON.stringify({ callId, callType }),
      });
    }

    const { status: resStatus, response } = formatResponse(
      200,
      true,
      "Test call dispatched",
      "success",
      `Call initiated to ${phone} via ${providerDetails.providerName}`,
      {
        callId,
        leadId,
        provider: providerDetails.provider,
        providerName: providerDetails.providerName,
        callType: callType || "confirm_agent",
      }
    );
    return res.status(resStatus).json(response);
  } catch (error) {
    logger.error("Manual test call failed", { error: error.message });
    const { status, response } = handleError(error, "dispatching test call");
    return res.status(status).json(response);
  }
};

/**
 * PATCH /api/calls/:id/assign
 * Assigns a call to a sales representative (Admin / Superadmin only)
 */
const assignCall = async (req, res) => {
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

    const { id } = req.params;
    const { assigned_to_id, assigned_to_name, assigned_to_email } = req.body || {};
    const { Lead, Activity } = require("../../core/database");
    const cleanId = id ? String(id).trim() : "";

    const call = await Call.findOne({
      where: {
        [Op.or]: [
          { call_id: cleanId },
          { call_id: { [Op.like]: `%${cleanId}%` } },
        ],
      },
    });

    if (!call) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: `Call with ID ${id} not found`,
        type: "error",
      });
    }

    const assignedBy = req.user?.name || req.user?.user_email || "Admin";
    const assignedAt = new Date();

    await call.update({
      assigned_to_id: assigned_to_id || null,
      assigned_to_name: assigned_to_name || null,
      assigned_to_email: assigned_to_email || null,
      assigned_by: assignedBy,
      assigned_at: assignedAt,
    });

    // If call has associated lead, also update lead's assignment and record activity
    if (call.lead_id && Lead) {
      const lead = await Lead.findByPk(call.lead_id);
      if (lead) {
        await lead.update({
          assigned_to_id: assigned_to_id || null,
          assigned_to_name: assigned_to_name || null,
          assigned_to_email: assigned_to_email || null,
          assigned_by: assignedBy,
          assigned_at: assignedAt,
        });

        if (Activity) {
          await Activity.create({
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            lead_id: call.lead_id,
            type: "assignment",
            title: assigned_to_name ? `Assigned to ${assigned_to_name}` : "Assignment Removed",
            detail: assigned_to_name
              ? `Call & Lead assigned to ${assigned_to_name} (${assigned_to_email || "N/A"}) by ${assignedBy}`
              : `Assignment removed by ${assignedBy}`,
            metadata: JSON.stringify({ assigned_to_id, assigned_to_name, assigned_by: assignedBy }),
          });
        }
      }
    }

    const formatted = formatCall(call);

    const { status, response } = formatResponse(
      200,
      true,
      "Call assigned successfully",
      "success",
      assigned_to_name
        ? `Call has been assigned to ${assigned_to_name}.`
        : "Call assignment has been cleared.",
      formatted
    );

    return res.status(status).json(response);
  } catch (error) {
    logger.error("Error assigning call", { error: error.message });
    const { status, response } = handleError(error, "assigning call");
    return res.status(status).json(response);
  }
};

/**
 * PUT /api/calls/:id or PATCH /api/calls/:id
 * Updates call record details (lead_name, phone, status, sentiment, outcome, location, seats, space_type, call_summary)
 */
const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { Lead, Activity } = require("../../core/database");
    const cleanId = id ? String(id).trim() : "";

    const call = await Call.findOne({
      where: {
        [Op.or]: [
          { call_id: cleanId },
          { call_id: { [Op.like]: `%${cleanId}%` } },
        ],
      },
    });

    if (!call) {
      const { status, response } = formatResponse(404, false, `Call with ID ${id} not found`, "error", "Call not found.");
      return res.status(status).json(response);
    }

    const {
      lead_name,
      leadName,
      phone,
      status: callStatus,
      sentiment,
      outcome,
      location,
      seats,
      space_type,
      spaceType,
      call_summary,
      callSummary,
    } = req.body || {};

    const updateData = {};
    if (lead_name !== undefined || leadName !== undefined) updateData.lead_name = lead_name !== undefined ? lead_name : leadName;
    if (phone !== undefined) updateData.phone = phone;
    if (callStatus !== undefined) updateData.status = callStatus;
    if (sentiment !== undefined) updateData.sentiment = sentiment;
    if (outcome !== undefined) updateData.outcome = outcome;
    if (location !== undefined) {
      updateData.location = location;
      updateData.original_location = location;
    }
    if (seats !== undefined) {
      updateData.seats = seats ? String(seats) : null;
      updateData.original_seats = seats ? String(seats) : null;
    }
    if (space_type !== undefined || spaceType !== undefined) {
      const sp = space_type !== undefined ? space_type : spaceType;
      updateData.space_type = sp;
      updateData.original_space_type = sp;
    }
    if (call_summary !== undefined || callSummary !== undefined) {
      updateData.call_summary = call_summary !== undefined ? call_summary : callSummary;
    }

    await call.update(updateData);

    // If linked to a lead, sync updates to lead record and log activity
    if (call.lead_id && Lead) {
      const lead = await Lead.findByPk(call.lead_id);
      if (lead) {
        const leadUpdates = {};
        if (updateData.lead_name) leadUpdates.name = updateData.lead_name;
        if (updateData.phone) leadUpdates.phone = updateData.phone;
        if (updateData.location) leadUpdates.location = updateData.location;
        if (updateData.seats) leadUpdates.seats = updateData.seats;
        if (updateData.space_type) leadUpdates.space_type = updateData.space_type;
        if (updateData.sentiment) leadUpdates.sentiment = updateData.sentiment;
        if (Object.keys(leadUpdates).length > 0) {
          await lead.update(leadUpdates);
        }

        if (Activity) {
          await Activity.create({
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            lead_id: call.lead_id,
            type: "note",
            title: "Call details updated",
            detail: `Call details updated by ${req.user?.name || "Admin"}: ${Object.keys(updateData).join(", ")}`,
            metadata: JSON.stringify(updateData),
          });
        }
      }
    }

    const formatted = formatCall(call);
    const { status: resStatus, response } = formatResponse(
      200,
      true,
      "Call updated successfully",
      "success",
      "Call record has been updated.",
      formatted
    );
    return res.status(resStatus).json(response);
  } catch (error) {
    logger.error("Error updating call", { error: error.message });
    const { status, response } = handleError(error, "updating call");
    return res.status(status).json(response);
  }
};

module.exports = {
  getAllCalls,
  getCallById,
  simulateCall,
  triggerTestCall,
  assignCall,
  updateCall,
};
