"use strict";

/**
 * Migration: Create Calling Agent Tables (leads, calls, activities, settings)
 * Specific to BizzHub AI Calling Agent backend.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // -------------------------------------------------------------
    // 1. LEADS TABLE
    // -------------------------------------------------------------
    await queryInterface.createTable("leads", {
      id: {
        type: Sequelize.STRING(64),
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: "Unknown",
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      company: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: "website",
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "new",
      },
      space_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      seats: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      duration: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      budget: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      recommended_centre: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tags: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: "[]",
      },
      ai_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ai_score_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sentiment: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      requirements_changed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      assigned_to_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      assigned_to_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_to_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_by: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("leads", ["phone"], { name: "idx_leads_phone" }).catch(() => {});
    await queryInterface.addIndex("leads", ["status"], { name: "idx_leads_status" }).catch(() => {});
    await queryInterface.addIndex("leads", ["created_at"], { name: "idx_leads_created_at" }).catch(() => {});
    await queryInterface.addIndex("leads", ["assigned_to_id"], { name: "idx_leads_assigned_to_id" }).catch(() => {});

    // -------------------------------------------------------------
    // 2. CALLS TABLE
    // -------------------------------------------------------------
    await queryInterface.createTable("calls", {
      call_id: {
        type: Sequelize.STRING(128),
        primaryKey: true,
        allowNull: false,
      },
      lead_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      lead_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "bolna",
      },
      call_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "confirm_agent",
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "initiated",
      },
      sentiment: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      outcome: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      callback_time: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      callback_schedule: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      call_summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      transcript: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      recording_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      original_location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      seats: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      original_seats: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      space_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      original_space_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      recommended_centre: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assistant_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      company_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      topic: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: "call",
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      assigned_to_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      assigned_to_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_to_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_by: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("calls", ["phone"], { name: "idx_calls_phone" }).catch(() => {});
    await queryInterface.addIndex("calls", ["lead_id"], { name: "idx_calls_lead_id" }).catch(() => {});
    await queryInterface.addIndex("calls", ["created_at"], { name: "idx_calls_created_at" }).catch(() => {});
    await queryInterface.addIndex("calls", ["status"], { name: "idx_calls_status" }).catch(() => {});
    await queryInterface.addIndex("calls", ["assigned_to_id"], { name: "idx_calls_assigned_to_id" }).catch(() => {});

    // -------------------------------------------------------------
    // 3. ACTIVITIES TABLE
    // -------------------------------------------------------------
    await queryInterface.createTable("activities", {
      id: {
        type: Sequelize.STRING(64),
        primaryKey: true,
        allowNull: false,
      },
      lead_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      detail: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("activities", ["lead_id"], { name: "idx_activities_lead_id" }).catch(() => {});
    await queryInterface.addIndex("activities", ["created_at"], { name: "idx_activities_created_at" }).catch(() => {});

    // -------------------------------------------------------------
    // 4. SETTINGS TABLE
    // -------------------------------------------------------------
    await queryInterface.createTable("settings", {
      key: {
        type: Sequelize.STRING(128),
        primaryKey: true,
        allowNull: false,
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("activities").catch(() => {});
    await queryInterface.dropTable("calls").catch(() => {});
    await queryInterface.dropTable("leads").catch(() => {});
    await queryInterface.dropTable("settings").catch(() => {});
  },
};
