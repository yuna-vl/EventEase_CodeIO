import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const BASE_URL = "http://127.0.0.1:5000/api";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(url, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runTests() {
  console.log("==================================================================");
  console.log("   EVENTEEASE STUDENT PROFILE (MERN) COMPREHENSIVE TEST SUITE     ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const student1Email = `yuna.student_${timestamp}@test.edu`;
  const student2Email = `alex.student_${timestamp}@test.edu`;
  const organizerEmail = `org_${timestamp}@test.edu`;
  const password = "TestPassword123!";
  let createdEventId = null;
  let createdOrgToken = null;

  try {
    // 1. Health check
  console.log("\n[Test 1] Backend Health & Connectivity Check");
  const healthRes = await request("/health");
  assert(healthRes.status === 200, "Health check responded with status 200");
  assert(healthRes.data.database?.connected === true, "MongoDB Atlas database is connected");

  // 2. Unauthenticated access guard
  console.log("\n[Test 2] Security: Unauthenticated profile access denied");
  const unauthRes = await request("/students/me");
  assert(unauthRes.status === 401, "GET /api/students/me returns 401 Unauthorized when unauthenticated");

  // 3. Register Student 1
  console.log("\n[Test 3] Create Student 1 (Yuna)");
  const signup1Res = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Yuna Kim",
      email: student1Email,
      password,
      role: "student"
    })
  });
  assert(signup1Res.status === 201, "Student 1 created successfully");
  const student1Token = signup1Res.data.token;
  const student1Id = signup1Res.data.user?.id;
  assert(Boolean(student1Token), "Valid JWT token issued for Student 1");
  assert(signup1Res.data.user?.role === "student", "Role is verified as student");

  // 4. Fetch Student 1 Own Profile (GET /api/students/me)
  console.log("\n[Test 4] Fetch Authenticated Student's Own Profile (GET /api/students/me)");
  const profile1Res = await request("/students/me", {
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  assert(profile1Res.status === 200, "GET /api/students/me returned 200 OK");
  assert(profile1Res.data.data.name === "Yuna Kim", "Returned profile name matches authenticated user");
  assert(profile1Res.data.data.email === student1Email, "Returned profile email matches authenticated user");
  assert(profile1Res.data.data.role === "student", "Profile role is student");
  assert(profile1Res.data.data.activityPoints === 0, "Initial activity points is 0");
  assert(Array.isArray(profile1Res.data.data.certificates), "Certificates list is returned as array");
  assert(Array.isArray(profile1Res.data.data.attendanceHistory), "Attendance history is returned as array");
  assert(profile1Res.data.data.password === undefined, "Sensitive password field is NOT returned");

  // 5. Update Permitted Profile Fields (PATCH /api/students/me)
  console.log("\n[Test 5] Update Permitted Student Profile Fields (PATCH /api/students/me)");
  const updatePayload = {
    name: "Yuna K. Kim",
    homeCollege: "Stanford Institute of Technology",
    phoneNumber: "+1 650-555-0142",
    graduationYear: "2026",
    rollNumber: "SIT2022CS042",
    interests: ["Artificial Intelligence", "UI/UX Design", "Hackathons"],
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
  };

  const updateRes = await request("/students/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${student1Token}` },
    body: JSON.stringify(updatePayload)
  });
  assert(updateRes.status === 200, "PATCH /api/students/me returned 200 OK");
  assert(updateRes.data.data.name === "Yuna K. Kim", "Updated name reflected in response");
  assert(updateRes.data.data.homeCollege === "Stanford Institute of Technology", "Updated college reflected");
  assert(updateRes.data.data.phoneNumber === "+1 650-555-0142", "Updated phone number reflected");
  assert(updateRes.data.data.graduationYear === "2026", "Updated graduation year reflected");
  assert(updateRes.data.data.rollNumber === "SIT2022CS042", "Updated roll number reflected");
  assert(updateRes.data.data.interests.length === 3, "Updated interests tags reflected");

  // 6. Verify Persistence after re-fetch
  console.log("\n[Test 6] Persistence: Re-fetch profile to ensure database persistence");
  const refetchRes = await request("/students/me", {
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  assert(refetchRes.data.data.name === "Yuna K. Kim", "Persisted name verified");
  assert(refetchRes.data.data.homeCollege === "Stanford Institute of Technology", "Persisted home college verified");
  assert(refetchRes.data.data.rollNumber === "SIT2022CS042", "Persisted roll number verified");

  // 7. Security: Block Restricted Fields Tampering
  console.log("\n[Test 7] Security: Prevent alteration of restricted fields (role, points, certs)");
  const tamperingAttempt = {
    role: "organizer",
    activityPoints: 99999,
    certificates: [{ title: "Fake Certificate" }],
    password: "newhackedpassword"
  };

  const tamperRes = await request("/students/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${student1Token}` },
    body: JSON.stringify(tamperingAttempt)
  });
  assert(tamperRes.status === 200, "Request completes without server crash");
  assert(tamperRes.data.data.role === "student", "Role remains 'student' (organizer escalation blocked)");
  assert(tamperRes.data.data.activityPoints === 0, "Activity points remain 0 (tampering blocked)");
  assert(tamperRes.data.data.certificates.length === 0, "Certificates array unaltered (forgery blocked)");

  // 8. Register Organizer & Create an Event
  console.log("\n[Test 8] Setup Event with Verified Organizer");
  const organizerSecret = process.env.ORGANIZER_SIGNUP_SECRET || "EventEaseOrganizer2026!";
  const orgSignupRes = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Prof. Alan Turing",
      email: organizerEmail,
      password,
      role: "organizer",
      organizerSecret
    })
  });
  assert(orgSignupRes.status === 201, "Organizer account provisioned with secret");
  const orgToken = orgSignupRes.data.token;
  createdOrgToken = orgToken;

  const eventRes = await request("/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${orgToken}` },
    body: JSON.stringify({
      title: `AI & Distributed Systems Workshop ${timestamp}`,
      description: "Hands-on engineering workshop on high-throughput backend services and modern AI pipelines.",
      category: "Technical",
      date: new Date(Date.now() + 86400000).toISOString(),
      time: "10:00 AM",
      venue: "Turing Auditorium, Block 4",
      capacity: 100,
      registrationType: "free"
    })
  });
  assert(eventRes.status === 201, "Event published by organizer");
  const eventId = eventRes.data.data._id;
  createdEventId = eventId;

  // 9. Student Registers for Event (Points NOT awarded yet)
  console.log("\n[Test 9] Student Registers for Event (Attendance Pending - 0 Points)");
  const regRes = await request(`/events/${eventId}/register`, {
    method: "POST",
    body: JSON.stringify({
      name: "Yuna K. Kim",
      email: student1Email,
      phone: "+1 650-555-0142",
      seats: 1
    })
  });
  assert(regRes.status === 201, "Student registered for event");
  const attendeeId = regRes.data.data._id;
  assert(Boolean(attendeeId), "Registration ID created");

  // Check profile attendance history before verification
  const profilePreAttendance = await request("/students/me", {
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  assert(profilePreAttendance.data.data.activityPoints === 0, "No points awarded for mere registration");
  assert(profilePreAttendance.data.data.attendanceHistory.length === 1, "Registered event listed in history");
  assert(profilePreAttendance.data.data.attendanceHistory[0].attended === false, "Attendance status is pending");

  // 10. Organizer Verifies Attendance & Awards Points
  console.log("\n[Test 10] Organizer Verifies Attendance & Awards Points (PATCH /api/events/:id/attendees/:attendeeId/attendance)");
  const attendanceRes = await request(`/events/${eventId}/attendees/${attendeeId}/attendance`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${orgToken}` }
  });
  assert(attendanceRes.status === 200, "Organizer verified attendee attendance successfully");
  assert(attendanceRes.data.data.attended === true, "Attendee marked as attended in registration");
  assert(attendanceRes.data.data.pointsAwarded === 50, "50 activity points awarded for verified attendance");

  // 11. Verify Student Profile After Verified Attendance
  console.log("\n[Test 11] Verify Student Profile Reflects Points (+50) & Official Certificate");
  const profilePostAttendance = await request("/students/me", {
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  assert(profilePostAttendance.data.data.activityPoints === 50, "Total activity points updated to 50 in student profile");
  assert(profilePostAttendance.data.data.stats.eventsAttended === 1, "Events attended count updated to 1");
  assert(profilePostAttendance.data.data.certificates.length === 1, "Certificate of Participation automatically generated");
  const cert = profilePostAttendance.data.data.certificates[0];
  assert(cert.title === "Certificate of Participation", "Certificate title verified");
  assert(Boolean(cert.certificateId), `Certificate ID generated: ${cert.certificateId}`);
  assert(Boolean(cert.verificationCode), `Official verification code generated: ${cert.verificationCode}`);

  // 12. Multiple Students Isolation Test
  console.log("\n[Test 12] Account Isolation: Switching accounts never leaks another student's profile");
  const signup2Res = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Alex Rivera",
      email: student2Email,
      password,
      role: "student"
    })
  });
  assert(signup2Res.status === 201, "Student 2 (Alex) created");
  const student2Token = signup2Res.data.token;

  const profile2Res = await request("/students/me", {
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert(profile2Res.data.data.name === "Alex Rivera", "Student 2 profile returns Alex Rivera");
  assert(profile2Res.data.data.email === student2Email, "Student 2 profile returns Alex's email");
  assert(profile2Res.data.data.activityPoints === 0, "Student 2 has independent 0 activity points");
  assert(profile2Res.data.data.certificates.length === 0, "Student 2 has 0 certificates (no leakage from Yuna)");
  assert(profile2Res.data.data.attendanceHistory.length === 0, "Student 2 has empty attendance history");

  console.log("\n==================================================================");
  console.log("   ALL 12 TEST SCENARIOS PASSED WITH FULL INTEGRATION SUCCESS!    ");
  console.log("==================================================================");
  } finally {
    if (createdEventId && createdOrgToken) {
      try {
        console.log(`Cleaning up test event ${createdEventId}...`);
        await request(`/events/${createdEventId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${createdOrgToken}` }
        });
        console.log("Test event cleaned up successfully.");
      } catch (cleanErr) {
        console.warn("Cleanup warning:", cleanErr.message);
      }
    }
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
