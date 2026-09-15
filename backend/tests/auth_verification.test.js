require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const http = require("http");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../src/core/database/models/user.model");
const express = require("express");
const app = express();

// Set up server instance for testing
const helmet = require("helmet");
const cors = require("cors");
const mainRouter = require("../src/routes");
const { errorHandler } = require("../src/core/utils/errorHandler");

app.use(cors());
app.use(express.json());
app.use("/api", mainRouter);
app.use(errorHandler);

let server;
let baseUrl;

const TEST_ADMIN = {
  user_id: "TEST_ADM01",
  user_email: "test.admin@bizzhub.test",
  raw_password: "Password@123",
  first_name: "Test",
  last_name: "Admin",
  role_name: "admin",
  status: "active",
};

const TEST_REGULAR_USER = {
  user_id: "TEST_USR01",
  user_email: "test.user@bizzhub.test",
  raw_password: "Password@123",
  first_name: "Test",
  last_name: "User",
  role_name: "user",
  status: "active",
};

const TEST_LOCATION_ADMIN = {
  user_id: "TEST_LOC01",
  user_email: "test.locationadmin@bizzhub.test",
  raw_password: "Password@123",
  first_name: "Test",
  last_name: "LocationAdmin",
  role_name: "location-admin",
  status: "active",
};

async function setupTestUsers() {
  const hashedPassword = await bcrypt.hash("Password@123", 10);

  // Upsert test admin
  await User.upsert({
    ...TEST_ADMIN,
    password: hashedPassword,
  });

  // Upsert test regular user
  await User.upsert({
    ...TEST_REGULAR_USER,
    password: hashedPassword,
  });

  // Upsert test location admin
  await User.upsert({
    ...TEST_LOCATION_ADMIN,
    password: hashedPassword,
  });
}

async function cleanupTestUsers() {
  try {
    await User.destroy({
      where: {
        user_id: [TEST_ADMIN.user_id, TEST_REGULAR_USER.user_id, TEST_LOCATION_ADMIN.user_id],
      },
    });
  } catch (err) {
    console.warn("Cleanup warning:", err.message);
  }
}

async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function runTests() {
  console.log("\n============================================================");
  console.log("   BIZZHUB CALLING AGENT - AUTH & AUTHORIZATION TEST SUITE   ");
  console.log("============================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      failedCount++;
    }
  }

  try {
    // 1. Start test server on dynamic port
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => {
        const port = s.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve(s);
      });
    });

    console.log(`Test server running on ${baseUrl}`);
    console.log("Setting up test database records...");
    await setupTestUsers();
    console.log("Test users created in MySQL.\n");

    // TEST 1: Unauthenticated request rejected (401)
    console.log("--- 1. Authentication Gate Tests ---");
    {
      const res = await makeRequest("/api/stats");
      assert(
        res.status === 401,
        "Unauthenticated request to /api/stats is rejected with 401",
        `Got status ${res.status}`
      );
      assert(
        res.data?.message?.includes("No token provided"),
        "Returns correct unauthorized message",
        JSON.stringify(res.data)
      );
    }

    // TEST 2: Missing login parameters (400)
    console.log("\n--- 2. Login Endpoint Validation Tests ---");
    {
      const res = await makeRequest("/api/auth/login", {
        method: "POST",
        body: { email: "" },
      });
      assert(
        res.status === 400,
        "Missing email/password returns 400 Bad Request",
        `Got status ${res.status}`
      );
    }

    // TEST 3: Invalid password rejected (401)
    {
      const res = await makeRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: TEST_ADMIN.user_email,
          password: "WrongPassword!999",
        },
      });
      assert(
        res.status === 401,
        "Invalid password returns 401 Unauthorized",
        `Got status ${res.status}`
      );
      assert(
        res.data?.message === "Invalid email or password.",
        "Returns secure invalid credential message"
      );
    }

    // TEST 4: Non-existent user rejected (401)
    {
      const res = await makeRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: "nonexistent@bizzhub.work",
          password: "SomePassword123",
        },
      });
      assert(
        res.status === 401,
        "Non-existent user email returns 401",
        `Got status ${res.status}`
      );
    }

    // TEST 5: Successful Admin Login (200 + JWT)
    console.log("\n--- 3. Successful Login & JWT Token Verification ---");
    let adminToken = "";
    let adminUser = null;
    {
      const res = await makeRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: TEST_ADMIN.user_email,
          password: TEST_ADMIN.raw_password,
        },
      });
      assert(
        res.status === 200,
        "Valid credentials return 200 OK",
        `Got status ${res.status}`
      );
      assert(
        !!res.data?.token,
        "Response contains JWT token string",
        res.data?.token
      );
      assert(
        res.data?.user?.role_name === "admin",
        "Response contains user profile with correct role_name",
        res.data?.user?.role_name
      );

      adminToken = res.data?.token;
      adminUser = res.data?.user;

      // Verify token signature with SECRET_KEY
      const secret = process.env.SECRET_KEY || "BIZZ1234";
      let decoded;
      try {
        decoded = jwt.verify(adminToken, secret);
      } catch (err) {
        decoded = null;
      }
      assert(
        !!decoded && decoded.user_id === TEST_ADMIN.user_id,
        `Token signature verified with SECRET_KEY (${secret})`,
        `Decoded: ${JSON.stringify(decoded)}`
      );
    }

    // TEST 6: Successful Regular User Login
    let regularToken = "";
    {
      const res = await makeRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: TEST_REGULAR_USER.user_email,
          password: TEST_REGULAR_USER.raw_password,
        },
      });
      assert(
        res.status === 200,
        "Regular user login returns 200 OK",
        `Got status ${res.status}`
      );
      regularToken = res.data?.token;
    }

    // TEST 6b: Successful Location Admin Login
    let locationAdminToken = "";
    {
      const res = await makeRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: TEST_LOCATION_ADMIN.user_email,
          password: TEST_LOCATION_ADMIN.raw_password,
        },
      });
      assert(
        res.status === 200,
        "Location admin login returns 200 OK",
        `Got status ${res.status}`
      );
      assert(
        res.data?.user?.role_name === "location-admin",
        "Location admin role_name is 'location-admin'",
        res.data?.user?.role_name
      );
      locationAdminToken = res.data?.token;
    }

    // TEST 7: Tampered Token Rejected (401)
    console.log("\n--- 4. Token Security & Anti-Tampering Tests ---");
    {
      const fakeToken = jwt.sign(
        { user_id: "HACKER", user_email: "hacker@evil.com", role_name: "admin" },
        "WRONG_SECRET_KEY_12345"
      );
      const res = await makeRequest("/api/stats", {
        headers: { Authorization: `Bearer ${fakeToken}` },
      });
      assert(
        res.status === 401,
        "Token signed with invalid SECRET_KEY is rejected with 401",
        `Got status ${res.status}`
      );
    }

    // TEST 8: Accessing Protected Endpoints with valid token
    console.log("\n--- 5. Protected Endpoint Access Tests ---");
    {
      const res = await makeRequest("/api/auth/me", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(
        res.status === 200,
        "GET /api/auth/me returns 200 OK with authenticated user profile",
        `Got status ${res.status}`
      );
      assert(
        res.data?.user?.user_id === TEST_ADMIN.user_id,
        "req.user populated from database matching token user_id",
        res.data?.user?.user_id
      );
    }
    {
      const adminStats = await makeRequest("/api/stats", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(
        adminStats.status === 200,
        "GET /api/stats returns 200 OK with valid metrics",
        `Got status ${adminStats.status}`
      );
      assert(
        typeof (adminStats.data?.data?.total ?? adminStats.data?.total) === "number",
        "Admin stats contains total count number"
      );

      // Non-admin stats scoping check: test.user has 0 assigned calls, should see 0
      const userStats = await makeRequest("/api/stats", {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      assert(
        userStats.status === 200,
        "GET /api/stats for non-admin returns 200 OK",
        `Got status ${userStats.status}`
      );
      const userTotal = userStats.data?.data?.total ?? userStats.data?.total;
      assert(
        userTotal === 0,
        "Non-admin user without assigned calls sees scoped total: 0 instead of all DB records",
        `Expected 0, got ${userTotal}`
      );
    }
    {
      const res = await makeRequest("/api/calls?page=1&limit=5", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(
        res.status === 200,
        "GET /api/calls returns 200 OK with paginated records",
        `Got status ${res.status}`
      );
    }

    // TEST 9: Role-Based Access Control (RBAC) on /api/calls/:id/assign
    console.log("\n--- 6. Role-Based Authorization (RBAC) Tests ---");
    {
      // Non-admin token should be rejected with 403 Forbidden
      const res = await makeRequest("/api/calls/CALL-TEST-001/assign", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${regularToken}` },
        body: {
          assigned_to_id: "REP001",
          assigned_to_name: "John Doe",
          assigned_to_email: "john@bizzhub.com",
        },
      });
      assert(
        res.status === 403,
        "Non-admin (role='user') is blocked from assigning sales rep with 403 Forbidden",
        `Got status ${res.status}: ${JSON.stringify(res.data)}`
      );
    }
    {
      // Location admin token should also be rejected with 403 Forbidden
      const res = await makeRequest("/api/calls/CALL-TEST-001/assign", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${locationAdminToken}` },
        body: {
          assigned_to_id: "REP001",
          assigned_to_name: "John Doe",
          assigned_to_email: "john@bizzhub.com",
        },
      });
      assert(
        res.status === 403,
        "Location admin (role='location-admin') is blocked from assigning sales rep with 403 Forbidden",
        `Got status ${res.status}: ${JSON.stringify(res.data)}`
      );
    }
    {
      // Admin token should pass the role check (status may be 200 or 404 if call doesn't exist, but NOT 401/403)
      const res = await makeRequest("/api/calls/CALL-TEST-001/assign", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          assigned_to_id: "REP001",
          assigned_to_name: "John Doe",
          assigned_to_email: "john@bizzhub.com",
        },
      });
      assert(
        res.status !== 401 && res.status !== 403,
        "Admin (role='admin') passes role authorization on assignment endpoint",
        `Got status ${res.status}`
      );
    }
    {
      // Location admin should NOT be able to fetch sales-reps dropdown list (403 Forbidden)
      const res = await makeRequest("/api/sales-reps", {
        headers: { Authorization: `Bearer ${locationAdminToken}` },
      });
      assert(
        res.status === 403,
        "Location admin (role='location-admin') is blocked from querying sales reps list with 403 Forbidden",
        `Got status ${res.status}: ${JSON.stringify(res.data)}`
      );
    }
    {
      // Admin CAN fetch sales-reps list (200 OK)
      const res = await makeRequest("/api/sales-reps", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(
        res.status === 200,
        "Admin (role='admin') can retrieve sales reps list with 200 OK",
        `Got status ${res.status}`
      );
    }
    {
      // Location admin should also be blocked from lead assignment endpoint (403 Forbidden)
      const res = await makeRequest("/api/leads/LEAD-TEST-001/assign", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${locationAdminToken}` },
        body: {
          assigned_to_id: "REP001",
          assigned_to_name: "John Doe",
          assigned_to_email: "john@bizzhub.com",
        },
      });
      assert(
        res.status === 403,
        "Location admin is blocked from PATCH /api/leads/:id/assign with 403 Forbidden",
        `Got status ${res.status}`
      );
    }

    console.log("\n============================================================");
    console.log(`   TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("============================================================\n");
  } catch (error) {
    console.error("Test execution error:", error);
    failedCount++;
  } finally {
    await cleanupTestUsers();
    if (server) {
      server.close();
    }
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
