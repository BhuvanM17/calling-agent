const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database.config");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    user_email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "active",
    },
    role_name: {
      type: DataTypes.STRING,
      defaultValue: "user",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
  }
);

module.exports = User;
