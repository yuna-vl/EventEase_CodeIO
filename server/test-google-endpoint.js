import assert from "node:assert";
import app from "./src/app.js";
import http from "node:http";

console.log("\n========================================================");
console.log("   EventEase - Live Google Auth Endpoint Integration    ");
console.log("========================================================\n");

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // Test 1: Empty request body should return 400
    console.log("1. Testing POST /api/auth/google with empty body...");
    const emptyRes = await fetch(`${baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const emptyData = await emptyRes.json();
    assert.strictEqual(emptyRes.status, 400);
    assert.strictEqual(emptyData.success, false);
    console.log("   ✓ Correctly rejected with 400:", emptyData.message);

    // Test 2: Invalid/garbage ID token should return 401
    console.log("\n2. Testing POST /api/auth/google with invalid ID token...");
    const invalidIdRes = await fetch(`${baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "invalid.jwt.token" })
    });
    const invalidIdData = await invalidIdRes.json();
    assert.strictEqual(invalidIdRes.status, 401);
    assert.strictEqual(invalidIdData.success, false);
    console.log("   ✓ Correctly rejected with 401:", invalidIdData.message);

    // Test 3: Invalid/garbage access token should return 401
    console.log("\n3. Testing POST /api/auth/google with invalid access token...");
    const invalidAccessRes = await fetch(`${baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: "ya29.invalid_access_token_12345" })
    });
    const invalidAccessData = await invalidAccessRes.json();
    assert.strictEqual(invalidAccessRes.status, 401);
    assert.strictEqual(invalidAccessData.success, false);
    console.log("   ✓ Correctly rejected with 401:", invalidAccessData.message);

    // Test 4: Frontend sends access token in credential field (the bug scenario)
    console.log("\n4. Testing POST /api/auth/google with misrouted access token in credential field...");
    const misroutedRes = await fetch(`${baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "ya29.misrouted_token_that_should_be_checked_as_access_token" })
    });
    const misroutedData = await misroutedRes.json();
    assert.strictEqual(misroutedRes.status, 401);
    console.log("   ✓ Correctly routed token to access token verification flow without crashing:", misroutedData.message);

    // Test 5: Verify CORS headers for Vercel origin
    console.log("\n5. Testing CORS for Vercel deployed origin...");
    const corsRes = await fetch(`${baseUrl}/health`, {
      method: "OPTIONS",
      headers: {
        "Origin": "https://event-ease-code-io.vercel.app",
        "Access-Control-Request-Method": "POST"
      }
    });
    const allowOrigin = corsRes.headers.get("access-control-allow-origin");
    assert.strictEqual(allowOrigin, "https://event-ease-code-io.vercel.app");
    console.log("   ✓ CORS dynamically allows origin:", allowOrigin);

    console.log("\n========================================================");
    console.log("   All Google Auth Endpoint Integration Tests PASSED!   ");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  } finally {
    server.close();
  }
});
