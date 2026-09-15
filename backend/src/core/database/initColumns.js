const sequelize = require("../config/database.config");
const logger = require("../utils/logger");

/**
 * Safely ensures assignment columns exist on MySQL tables `calls` and `leads`
 */
async function ensureAssignmentColumns() {
  const queryInterface = sequelize.getQueryInterface();

  const columnsToAdd = [
    { name: "assigned_to_id", type: "VARCHAR(64) NULL" },
    { name: "assigned_to_name", type: "VARCHAR(255) NULL" },
    { name: "assigned_to_email", type: "VARCHAR(255) NULL" },
    { name: "assigned_by", type: "VARCHAR(255) NULL" },
    { name: "assigned_at", type: "DATETIME NULL" },
  ];

  const tables = ["calls", "leads"];

  for (const table of tables) {
    try {
      const tableDescription = await queryInterface.describeTable(table).catch(() => null);
      if (!tableDescription) continue;

      for (const col of columnsToAdd) {
        if (!tableDescription[col.name]) {
          try {
            await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.type};`);
            logger.info(`✓ Added column '${col.name}' to table '${table}'`);
          } catch (alterErr) {
            logger.warn(`Could not add column ${col.name} to ${table}: ${alterErr.message}`);
          }
        }
      }
    } catch (err) {
      logger.warn(`Error checking schema for table '${table}': ${err.message}`);
    }
  }
}

module.exports = { ensureAssignmentColumns };
