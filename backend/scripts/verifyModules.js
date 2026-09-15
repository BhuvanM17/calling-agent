const { BOLNA_CONSTANTS, BolnaService, BolnaController, bolnaRoutes } = require("../src/modules/bolna");
const { META_CONSTANTS, MetaService } = require("../src/modules/meta");
const { LEAD_CONSTANTS, Lead, Activity, LeadService, leadController, leadRoutes } = require("../src/modules/leads");
const { CALL_CONSTANTS, Call, CallService, callController, callRoutes } = require("../src/modules/calls");
const { WEBHOOK_CONSTANTS, WebhookController, webhookRoutes } = require("../src/modules/webhooks");
const { AI_CONSTANTS, AIService, aiController, aiRoutes } = require("../src/modules/ai");
const { statsController, statsRoutes } = require("../src/modules/stats");
const { sequelize } = require("../src/core/database");
const { env, validateEnv } = require("../src/core/config/env.config");
const { errorHandler } = require("../src/core/utils/errorHandler");
const logger = require("../src/core/utils/logger");

console.log("=== Testing ERP Modular Architecture Loading & Resolution ===");

// 1. Check Bolna module
console.log("✓ Bolna constants:", BOLNA_CONSTANTS.BASE_URL);
if (typeof BolnaService.createPhoneCall !== "function") throw new Error("BolnaService missing createPhoneCall");
if (typeof BolnaController.triggerCall !== "function") throw new Error("BolnaController missing triggerCall");

// 3. Check Meta module
console.log("✓ Meta constants:", META_CONSTANTS.GRAPH_API_VERSION);
if (typeof MetaService.getLeadData !== "function") throw new Error("MetaService missing getLeadData");

// 4. Check Leads module
console.log("✓ Leads constants:", LEAD_CONSTANTS.STATUSES.NEW);
if (typeof leadController.getAllLeads !== "function") throw new Error("LeadController missing getAllLeads");
if (typeof LeadService.formatLead !== "function") throw new Error("LeadService missing formatLead");

// 5. Check Calls module
console.log("✓ Calls constants:", CALL_CONSTANTS.PROVIDERS.BOLNA);
if (typeof callController.getAllCalls !== "function") throw new Error("CallController missing getAllCalls");
if (typeof CallService.createPhoneCall !== "function") throw new Error("CallService missing createPhoneCall");

// 6. Check Webhooks module
console.log("✓ Webhook routes mounted:", typeof webhookRoutes);
if (typeof WebhookController.handleBolnaEvent !== "function") throw new Error("WebhookController missing handleBolnaEvent");

// 7. Check AI module
console.log("✓ AI constants:", AI_CONSTANTS.DEFAULT_MODEL);
if (typeof aiController.scoreLeads !== "function") throw new Error("AIController missing scoreLeads");
if (typeof AIService.scoreLeads !== "function") throw new Error("AIService missing scoreLeads");

// 8. Check Stats module
if (typeof statsController.getStats !== "function") throw new Error("StatsController missing getStats");

// 9. Check Database Model Associations
if (!Lead.associations.calls) throw new Error("Lead hasMany Call association missing");
if (!Call.associations.lead) throw new Error("Call belongsTo Lead association missing");
if (!Lead.associations.activities) throw new Error("Lead hasMany Activity association missing");
if (!Activity.associations.lead) throw new Error("Activity belongsTo Lead association missing");

console.log("\n🎉 ALL ERP MODULES AND ASSOCIATIONS VERIFIED SUCCESSFULLY!");
process.exit(0);
