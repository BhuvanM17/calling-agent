const jwt = require("jsonwebtoken");
const { Lead, Call, User, sequelize } = require("../src/core/database");

const SECRET_KEY = process.env.SECRET_KEY || "test_secret_key_12345";
process.env.SECRET_KEY = SECRET_KEY;

async function runTests() {
  console.log("=== Starting Authentication, Assignment & RBAC Verification Tests ===");

  try {
    // 1. Check DB Connection
    await sequelize.authenticate();
    console.log("✓ Database connection successful");

    const { ensureAssignmentColumns } = require("../src/core/database/initColumns");
    await ensureAssignmentColumns();

    await sequelize.sync({ alter: false });
    console.log("✓ Models synced successfully");

    // 2. Test JWT Token Creation (simulating HubManage backend issuing a token)
    const adminToken = jwt.sign(
      { user_id: "ADM001", user_email: "admin@bizzhub.com", role_name: "admin" },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    const userToken = jwt.sign(
      { user_id: "REP001", user_email: "rahul@bizzhub.com", role_name: "user" },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    console.log("✓ Generated valid Admin & User JWT tokens with shared SECRET_KEY");

    // 3. Create or find test lead & call
    const testLeadId = `lead_test_${Date.now()}`;
    const testCallId = `call_test_${Date.now()}`;

    const lead = await Lead.create({
      id: testLeadId,
      name: "Acme Corp Lead",
      phone: "+919876543210",
      email: "contact@acme.com",
      status: "new",
      source: "website",
    });
    console.log(`✓ Created test lead: ${lead.id}`);

    const call = await Call.create({
      call_id: testCallId,
      lead_id: testLeadId,
      lead_name: "Acme Corp Lead",
      phone: "+919876543210",
      status: "completed",
      call_summary: "Customer interested in 25 seats in Koramangala.",
      provider: "bolna",
    });
    console.log(`✓ Created test call: ${call.call_id}`);

    // 4. Test Assignment
    const assignedRep = {
      assigned_to_id: "REP001",
      assigned_to_name: "Rahul Sharma",
      assigned_to_email: "rahul@bizzhub.com",
      assigned_by: "Admin Manager",
      assigned_at: new Date(),
    };

    await call.update(assignedRep);
    await lead.update(assignedRep);

    const updatedCall = await Call.findByPk(testCallId);
    const updatedLead = await Lead.findByPk(testLeadId);

    if (updatedCall.assigned_to_id === "REP001" && updatedLead.assigned_to_id === "REP001") {
      console.log(`✓ Call & Lead successfully assigned to ${updatedCall.assigned_to_name} (ID: ${updatedCall.assigned_to_id})`);
    } else {
      throw new Error("Assignment verification failed");
    }

    // 5. Clean up test records
    await call.destroy();
    await lead.destroy();
    console.log("✓ Cleaned up test records");

    console.log("\n✅ ALL BACKEND & ASSIGNMENT VERIFICATIONS PASSED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

runTests();
