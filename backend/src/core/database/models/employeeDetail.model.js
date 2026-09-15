const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database.config");

const EmployeeDetail = sequelize.define(
  "EmployeeDetail",
  {
    employee_id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    employee_first_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    employee_middle_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    employee_last_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    personal_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    official_email_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    center_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "employee_details",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = EmployeeDetail;
