require("dotenv").config();
const sequelize = require("../src/core/config/database.config");
const migration = require("../migrations/20260915120000-create-calling-agent-tables");
const logger = require("../src/core/utils/logger");

const MIGRATION_NAME = "20260915120000-create-calling-agent-tables.js";

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    logger.info("Connecting to database for migration...");
    await sequelize.authenticate();
    logger.info("✓ Database connection established");

    // Check if tables already exist or execute migration
    const tables = ["leads", "calls", "activities", "settings"];
    logger.info("Executing migration for calling agent tables: " + tables.join(", "));

    // Run migration up
    try {
      await migration.up(queryInterface, sequelize.Sequelize);
      logger.info("✓ Migration executed successfully via QueryInterface");
    } catch (migErr) {
      // If tables already exist in this database, warn and verify columns
      if (migErr.name === "SequelizeDatabaseError" && migErr.message.includes("already exists")) {
        logger.info("ℹ Tables already exist in database, verifying columns & indexes...");
      } else {
        throw migErr;
      }
    }

    // Ensure assignment columns exist on calls & leads (safe idempotent check)
    const { ensureAssignmentColumns } = require("../src/core/database/initColumns");
    await ensureAssignmentColumns();

    // Record migration in sequelizemeta if table exists
    try {
      const [metaTable] = await sequelize.query("SHOW TABLES LIKE 'sequelizemeta'");
      if (metaTable.length > 0) {
        const [existing] = await sequelize.query(
          "SELECT name FROM sequelizemeta WHERE name = :name",
          { replacements: { name: MIGRATION_NAME }, type: sequelize.QueryTypes.SELECT }
        );
        if (!existing) {
          await sequelize.query(
            "INSERT INTO sequelizemeta (name) VALUES (:name)",
            { replacements: { name: MIGRATION_NAME } }
          );
          logger.info(`✓ Recorded ${MIGRATION_NAME} in sequelizemeta`);
        } else {
          logger.info(`ℹ ${MIGRATION_NAME} is already recorded in sequelizemeta`);
        }
      }
    } catch (metaErr) {
      logger.warn(`Could not update sequelizemeta: ${metaErr.message}`);
    }

    // Print summary verification
    logger.info("=== VERIFYING CREATED / EXISTING CALLING AGENT TABLES ===");
    for (const t of tables) {
      const [cols] = await sequelize.query(`DESCRIBE \`${t}\``);
      logger.info(`✓ Table '${t}' is ready with ${cols.length} columns`);
    }

    logger.info("✓ Calling Agent database migration completed successfully!");
    process.exit(0);
  } catch (err) {
    logger.error("❌ Migration failed: " + err.message, { stack: err.stack });
    process.exit(1);
  }
}

run();
