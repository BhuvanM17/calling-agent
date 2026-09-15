const { DataTypes } = require("sequelize");
const sequelize = require("../../core/config/database.config");

const Lead = sequelize.define(
  "Lead",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Unknown",
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: "website",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "new",
    },
    space_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    seats: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    duration: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    budget: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    recommended_centre: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
    },
    ai_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ai_score_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentiment: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    requirements_changed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: "leads",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["phone"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
      { fields: ["assigned_to_id"] },
    ],
  }
);

module.exports = Lead;
module.exports.Lead = Lead;

