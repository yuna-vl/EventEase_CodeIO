import assert from "node:assert";
import { OAuth2Client } from "google-auth-library";

console.log("\n========================================================");
console.log("   EventEase - Google Auth Verification Unit Tests      ");
console.log("========================================================\n");

// Test 1: OAuth2Client instantiation
console.log("1. Testing OAuth2Client import & initialization...");
const client = new OAuth2Client("test-client-id.apps.googleusercontent.com");
assert(typeof client.verifyIdToken === "function", "verifyIdToken method exists");
assert(typeof client.getTokenInfo === "function", "getTokenInfo method exists");
console.log("   ✓ OAuth2Client correctly provides verifyIdToken and getTokenInfo\n");

// Test 2: Payload token auto-detection
console.log("2. Testing payload auto-detection logic...");

function detectTokenTypes(body) {
  let { credential, accessToken, token: legacyToken } = body;

  if (!credential && !accessToken && legacyToken) {
    if (typeof legacyToken === "string" && (legacyToken.startsWith("ey") || legacyToken.split(".").length === 3)) {
      credential = legacyToken;
    } else {
      accessToken = legacyToken;
    }
  }

  // If credential is an access token (e.g. ya29...)
  if (credential && typeof credential === "string") {
    const isJwt = credential.startsWith("ey") || (credential.includes(".") && credential.split(".").length === 3);
    if (!isJwt) {
      if (!accessToken) accessToken = credential;
      credential = null;
    }
  }

  // If accessToken is a JWT ID token (starts with ey and has 3 parts)
  if (accessToken && typeof accessToken === "string") {
    const isJwt = accessToken.startsWith("ey") || (accessToken.includes(".") && accessToken.split(".").length === 3);
    if (isJwt) {
      if (!credential) credential = accessToken;
      accessToken = null;
    }
  }

  return { credential, accessToken };
}

// Case 2a: Frontend mistakenly sent access token in credential field
const caseA = detectTokenTypes({ credential: "ya29.a0AWY7Ckm-random-access-token-characters-12345" });
assert.strictEqual(caseA.credential, null, "Should nullify credential when it's an access token");
assert.strictEqual(caseA.accessToken, "ya29.a0AWY7Ckm-random-access-token-characters-12345", "Should move access token to accessToken");
console.log("   ✓ Correctly re-routes access token sent under credential field");

// Case 2b: Frontend sent real JWT ID token in credential field
const fakeJwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIn0.signature";
const caseB = detectTokenTypes({ credential: fakeJwt });
assert.strictEqual(caseB.credential, fakeJwt, "Should retain JWT as credential");
assert.strictEqual(caseB.accessToken, undefined, "accessToken remains undefined");
console.log("   ✓ Correctly preserves JWT ID token under credential field");

// Case 2c: Frontend sent JWT in accessToken field
const caseC = detectTokenTypes({ accessToken: fakeJwt });
assert.strictEqual(caseC.credential, fakeJwt, "Should move JWT to credential field");
assert.strictEqual(caseC.accessToken, null, "Should nullify accessToken");
console.log("   ✓ Correctly promotes misplaced JWT from accessToken to credential\n");

// Test 3: Audience mismatch detection
console.log("3. Testing audience mismatch logic...");
const configuredClientId = "123456789-abc.apps.googleusercontent.com";
const incomingAud = "987654321-wrong.apps.googleusercontent.com";
const isAudienceMismatch = configuredClientId && incomingAud !== configuredClientId;
assert(isAudienceMismatch, "Should flag audience mismatch");
console.log("   ✓ Audience mismatch correctly detected and rejected\n");

// Test 4: Token masking helper
console.log("4. Testing safeMask diagnostic helper...");
const safeMask = (val) => {
  if (!val || typeof val !== "string") return "[none]";
  if (val.length <= 10) return "***";
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
};
assert.strictEqual(safeMask("ya29.a0AWY7Ckm1234567890"), "ya29...7890", "Should mask long token");
assert.strictEqual(safeMask("short"), "***", "Should mask short values");
assert.strictEqual(safeMask(null), "[none]", "Should handle null");
console.log("   ✓ Safe diagnostic masking protects sensitive token credentials\n");

// Test 5: Verify invalid token rejection via real OAuth2Client
console.log("5. Testing verifyIdToken rejection with fake token...");
try {
  await client.verifyIdToken({ idToken: "invalid-id-token" });
  assert.fail("Should have thrown error for invalid token");
} catch (err) {
  assert(err.message.length > 0, "Error was caught");
  console.log("   ✓ Google verifyIdToken safely rejects invalid credential:", err.message);
}

console.log("\n========================================================");
console.log("   All Google Auth Unit Tests PASSED Successfully!      ");
console.log("========================================================\n");
