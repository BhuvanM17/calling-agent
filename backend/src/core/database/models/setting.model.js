const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database.config");

const Setting = sequelize.define(
  "Setting",
  {
    key: {
      type: DataTypes.STRING(128),
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "settings",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Setting;
