const { DataTypes } = require("sequelize");
const sequelize = require("../../core/config/database.config");

const Call = sequelize.define(
  "Call",
  {
    call_id: {
      type: DataTypes.STRING(128),
      primaryKey: true,
    },
    lead_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    lead_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      defaultValue: "bolna",
    },
    call_type: {
      type: DataTypes.STRING(50),
      defaultValue: "confirm_agent",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "initiated",
    },
    sentiment: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    outcome: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    callback_time: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    callback_schedule: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    call_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transcript: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    recording_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    original_location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    seats: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    original_seats: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    space_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    original_space_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    recommended_centre: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    assistant_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    topic: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: "call",
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assigned_to_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    assigned_to_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    assigned_to_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    assigned_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "calls",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["phone"] },
      { fields: ["lead_id"] },
      { fields: ["created_at"] },
      { fields: ["status"] },
      { fields: ["assigned_to_id"] },
    ],
  }
);

module.exports = Call;
module.exports.Call = Call;

