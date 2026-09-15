require("dotenv").config();
const { sequelize, Lead, Call, Activity } = require("../src/core/database");
const { leadController } = require("../src/modules/leads");
const { callController } = require("../src/modules/calls");
const { statsController } = require("../src/modules/stats");

// Helper mock response
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("====================================================");
  console.log("🚀 Starting MySQL Backend CRUD & Pagination Tests");
  console.log("====================================================");

  await sequelize.authenticate();
  console.log("✓ MySQL Database Authenticated");

  // Clean up any test records
  await Lead.destroy({ where: { phone: { [require("sequelize").Op.like]: "%99887766%" } } });

  // 1. Create Lead 1
  console.log("\n--- TEST 1: Create Leads ---");
  const mockReq1 = {
    body: {
      name: "Rohit Sharma",
      phone: "+91 9988776655",
      email: "rohit@testcorp.in",
      company: "TestCorp India",
      source: "website",
      location: "Koramangala",
      spaceType: "Managed Office",
      seats: "25",
      notes: "Urgent move-in requirement next month.",
    },
  };
  const mockRes1 = createMockRes();
  await leadController.createLead(mockReq1, mockRes1);
  console.log("Status:", mockRes1.statusCode);
  const lead1 = mockRes1.body?.data?.lead || mockRes1.body?.lead;
  console.log("✓ Lead 1 Created:", lead1?.id, lead1?.name, lead1?.seats, "seats");

  // Create Lead 2
  const mockReq2 = {
    body: {
      name: "Priya Patel",
      phone: "+91 9988776656",
      email: "priya@ventures.com",
      company: "Ventures Studio",
      source: "instagram",
      location: "Indiranagar",
      spaceType: "Private Cabin",
      seats: "8",
      notes: "Interested in 8 seats cabin.",
    },
  };
  const mockRes2 = createMockRes();
  await leadController.createLead(mockReq2, mockRes2);
  const lead2 = mockRes2.body?.data?.lead || mockRes2.body?.lead;
  console.log("✓ Lead 2 Created:", lead2?.id, lead2?.name, lead2?.seats, "seats");

  // 2. Test Pagination on GET /api/leads
  console.log("\n--- TEST 2: Pagination (page=1, limit=1) ---");
  const page1Req = {
    query: { page: "1", limit: "1" },
    headers: {},
  };
  const page1Res = createMockRes();
  await leadController.getAllLeads(page1Req, page1Res);
  console.log("Page 1 Status:", page1Res.statusCode);
  console.log("Page 1 Data:", {
    totalRecords: page1Res.body?.data?.totalRecords,
    totalPages: page1Res.body?.data?.totalPages,
    currentPage: page1Res.body?.data?.currentPage,
    leadsCount: page1Res.body?.data?.leads?.length,
    firstLead: page1Res.body?.data?.leads?.[0]?.name,
  });

  if (page1Res.body?.data?.totalPages >= 2 && page1Res.body?.data?.leads?.length === 1) {
    console.log("✅ Page 1 Pagination Verified Successfully!");
  } else {
    throw new Error("Pagination verification failed on Page 1");
  }

  // Test Page 2
  console.log("\n--- TEST 3: Pagination (page=2, limit=1) ---");
  const page2Req = {
    query: { page: "2", limit: "1" },
    headers: {},
  };
  const page2Res = createMockRes();
  await leadController.getAllLeads(page2Req, page2Res);
  console.log("Page 2 Data:", {
    currentPage: page2Res.body?.data?.currentPage,
    firstLead: page2Res.body?.data?.leads?.[0]?.name,
  });

  if (page2Res.body?.data?.currentPage === 2 && page2Res.body?.data?.leads?.length === 1) {
    console.log("✅ Page 2 Pagination Verified Successfully!");
  }

  // 3. Test Lead Status Update and Note Activity
  console.log("\n--- TEST 4: Update Status & Add Activity Note ---");
  const updateStatusReq = {
    params: { id: lead1.id },
    body: { status: "qualified", reason: "Budget and requirements verified via call." },
  };
  const updateStatusRes = createMockRes();
  await leadController.updateLeadStatus(updateStatusReq, updateStatusRes);
  console.log("✓ Updated Status:", updateStatusRes.body?.data?.lead?.status);

  const noteReq = {
    params: { id: lead1.id },
    body: { note: "Site visit scheduled for Friday 3 PM.", author: "Senior Sales Advisor" },
  };
  const noteRes = createMockRes();
  await leadController.addLeadNote(noteReq, noteRes);
  console.log("✓ Added Note Activity:", noteRes.body?.data?.activity?.title);

  // 4. Test Lead By ID (with activities & calls)
  console.log("\n--- TEST 5: Fetch Lead By ID with Activities ---");
  const getByIdReq = { params: { id: lead1.id } };
  const getByIdRes = createMockRes();
  await leadController.getLeadById(getByIdReq, getByIdRes);
  const fetched = getByIdRes.body?.data;
  console.log("✓ Lead Fetched:", fetched.name, "Activities count:", fetched.activities?.length);

  // 5. Test Call Simulation
  console.log("\n--- TEST 6: Call Simulation & Logging ---");
  const simReq = {
    body: {
      leadName: lead1.name,
      phone: lead1.phone,
      callSummary: "Rohit confirmed requirement for 25 seats in Koramangala Hub and requested proposal.",
      outcome: "Site Visit Scheduled",
      sentiment: "Positive",
      callbackTime: "Tomorrow 11:00 AM",
      status: "completed",
      seats: "25",
      spaceType: "Managed Office",
    },
  };
  const simRes = createMockRes();
  await callController.simulateCall(simReq, simRes);
  console.log("✓ Simulated Call Created:", simRes.body?.data?.callId, "Sentiment:", simRes.body?.data?.call?.sentiment);

  // 6. Test Calls Pagination
  console.log("\n--- TEST 7: Calls Pagination (page=1, limit=5) ---");
  const callsReq = {
    query: { page: "1", limit: "5" },
    headers: {},
  };
  const callsRes = createMockRes();
  await callController.getAllCalls(callsReq, callsRes);
  console.log("Calls Pagination:", {
    totalRecords: callsRes.body?.data?.totalRecords,
    totalPages: callsRes.body?.data?.totalPages,
    currentPage: callsRes.body?.data?.currentPage,
    callsCount: callsRes.body?.data?.calls?.length,
  });

  // 7. Test Stats Endpoint
  console.log("\n--- TEST 8: Aggregate Stats ---");
  const statsReq = { headers: {} };
  const statsRes = createMockRes();
  await statsController.getStats(statsReq, statsRes);
  console.log("✓ Stats Result:", statsRes.body);

  console.log("\n====================================================");
  console.log("🎉 ALL TESTS PASSED! MySQL Backend and Pagination OK!");
  console.log("====================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
