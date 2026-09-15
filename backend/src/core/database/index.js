const sequelize = require("../config/database.config");
const Lead = require("../../modules/leads/lead.model");
const Activity = require("../../modules/leads/activity.model");
const Call = require("../../modules/calls/call.model");
const Setting = require("./models/setting.model");
const User = require("./models/user.model");
const EmployeeDetail = require("./models/employeeDetail.model");

// Associations
Lead.hasMany(Call, { foreignKey: "lead_id", as: "calls", onDelete: "CASCADE" });
Call.belongsTo(Lead, { foreignKey: "lead_id", as: "lead" });

Lead.hasMany(Activity, { foreignKey: "lead_id", as: "activities", onDelete: "CASCADE" });
Activity.belongsTo(Lead, { foreignKey: "lead_id", as: "lead" });

User.belongsTo(EmployeeDetail, { foreignKey: "employee_id", targetKey: "employee_id", as: "employee" });
EmployeeDetail.hasOne(User, { foreignKey: "employee_id", sourceKey: "employee_id", as: "user" });

module.exports = {
  sequelize,
  Lead,
  Call,
  Activity,
  Setting,
  User,
  EmployeeDetail,
};

