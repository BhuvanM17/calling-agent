const { Op } = require("sequelize");
const { Call, Lead } = require("../../core/database");
const { CallService } = require("../calls/call.service");
const { formatResponse, handleError } = require("../../core/utils/formatResponse");

const getStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Role-based visibility scoping
    const userRole = (req.user?.role_name || "").toLowerCase().trim();
    const isSuperAdminOrAdmin = ["super-admin", "admin"].includes(userRole);

    let baseCallWhere = null;
    let baseLeadWhere = null;

    if (!isSuperAdminOrAdmin && req.user?.user_id) {
      const userConditions = [{ assigned_to_id: req.user.user_id }];
      if (req.user.user_email) {
        userConditions.push({ assigned_to_email: req.user.user_email });
      }
      baseCallWhere = { [Op.or]: userConditions };
      baseLeadWhere = { [Op.or]: userConditions };
    }

    const mergeCallWhere = (condition) => {
      if (!baseCallWhere) return condition ? { where: condition } : {};
      if (!condition) return { where: baseCallWhere };
      return { where: { [Op.and]: [baseCallWhere, condition] } };
    };

    const mergeLeadWhere = (condition) => {
      if (!baseLeadWhere) return condition ? { where: condition } : {};
      if (!condition) return { where: baseLeadWhere };
      return { where: { [Op.and]: [baseLeadWhere, condition] } };
    };

    const [
      totalCalls,
      completedCalls,
      confirmedCalls,
      failedCalls,
      initiatedCalls,
      todayCalls,
      callbackCalls,
      inboundCalls,
      outboundCalls,
      instagramLeads,
      websiteLeads,
      posCalls,
      neuCalls,
      negCalls,
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      tourLeads,
      convertedLeads,
      lostLeads,
    ] = await Promise.all([
      Call.count(mergeCallWhere()),
      Call.count(mergeCallWhere({ status: "completed" })),
      Call.count(
        mergeCallWhere({
          [Op.or]: [
            { status: "confirmed" },
            { outcome: { [Op.like]: "%confirm%" } },
          ],
        })
      ),
      Call.count(mergeCallWhere({ status: "failed" })),
      Call.count(mergeCallWhere({ status: "initiated" })),
      Call.count(mergeCallWhere({ created_at: { [Op.gte]: todayStart } })),
      Call.count(
        mergeCallWhere({
          [Op.or]: [
            { callback_time: { [Op.ne]: null } },
            { outcome: { [Op.like]: "%callback%" } },
          ],
        })
      ),
      Call.count(mergeCallWhere({ call_type: "inbound" })),
      Call.count(
        mergeCallWhere({
          [Op.or]: [{ call_type: "outbound" }, { call_type: "confirm_agent" }, { call_type: "just_call" }],
        })
      ),
      Call.count(mergeCallWhere({ source: "instagram" })),
      Call.count(mergeCallWhere({ source: "website" })),
      Call.count(mergeCallWhere({ sentiment: "Positive" })),
      Call.count(mergeCallWhere({ sentiment: "Neutral" })),
      Call.count(mergeCallWhere({ sentiment: "Negative" })),
      Lead.count(mergeLeadWhere()),
      Lead.count(mergeLeadWhere({ status: "new" })),
      Lead.count(mergeLeadWhere({ status: "contacted" })),
      Lead.count(mergeLeadWhere({ status: "qualified" })),
      Lead.count(mergeLeadWhere({ status: "tour_scheduled" })),
      Lead.count(mergeLeadWhere({ status: "converted" })),
      Lead.count(mergeLeadWhere({ status: "lost" })),
    ]);

    const providerDetails = CallService.getProviderDetails();

    const statsData = {
      // Calls metrics
      total: totalCalls,
      completed: completedCalls,
      confirmed: confirmedCalls,
      failed: failedCalls,
      initiated: initiatedCalls,
      today: todayCalls,
      callbacks: callbackCalls,
      inbound: inboundCalls,
      outbound: outboundCalls,
      instagram: instagramLeads,
      website: websiteLeads,
      positive: posCalls,
      neutral: neuCalls,
      negative: negCalls,

      // Leads metrics
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      tourLeads,
      convertedLeads,
      lostLeads,

      // Server info
      uptime: Math.floor(process.uptime()),
      ...providerDetails,
    };

    if (req.headers["x-response-format"] === "hubmanage") {
      const { status, response } = formatResponse(
        200,
        true,
        "Stats retrieved successfully",
        "success",
        "Dashboard stats retrieved.",
        statsData
      );
      return res.status(status).json(response);
    }

    return res.status(200).json(statsData);
  } catch (error) {
    const { status, response } = handleError(error, "retrieving stats");
    return res.status(status).json(response);
  }
};

module.exports = {
  getStats,
};
