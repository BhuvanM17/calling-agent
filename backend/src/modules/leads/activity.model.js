const { DataTypes } = require("sequelize");
const sequelize = require("../../core/config/database.config");

const Activity = sequelize.define(
  "Activity",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    lead_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    detail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "activities",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["lead_id"] },
      { fields: ["created_at"] },
    ],
  }
);

module.exports = Activity;
module.exports.Activity = Activity;

