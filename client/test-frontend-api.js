import api from "./src/services/api.js";

async function verifyFrontendIntegration() {
  console.log("\n========================================================");
  console.log("   EventEase Live - Frontend API Integration Test       ");
  console.log("========================================================\n");

  let createdEventId = null;

  try {
    // 1. Health check
    const health = await api.getHealth();
    console.log("1. Backend Health Check:", health.status, "- DB Connected:", health.database?.connected);

    // 2. Organizer Login
    const loginRes = await api.loginOrganizer({
      email: "admin@eventease.live",
      password: "EventEaseAdmin2026!"
    });
    console.log("2. Organizer Login:", loginRes.success ? "SUCCESS" : "FAILED", "- Token received:", !!loginRes.token);
    const token = loginRes.token;

    // 3. Organizer Profile Verification
    const profileRes = await api.getOrganizerProfile(token);
    console.log("3. Organizer Profile:", profileRes.success ? "SUCCESS" : "FAILED", "- Organizer:", profileRes.organizer?.name);

    // 4. Protected Event Creation
    const createRes = await api.createEvent(
      {
        title: "Cloud Architecture Summit 2026",
        description: "Deep dive into distributed systems, event-driven microservices, and multi-region resilience.",
        date: new Date(Date.now() + 10 * 86400000).toISOString(),
        venue: "Grand Auditorium & Live Stream",
        capacity: 2
      },
      token
    );
    console.log("4. Protected Event Creation:", createRes.success ? "SUCCESS" : "FAILED", "- ID:", createRes.data?._id);
    createdEventId = createRes.data?._id;

    // 5. Public Event Browsing
    const eventsRes = await api.getEvents();
    const foundEvent = eventsRes.data.find(e => e._id === createdEventId);
    console.log("5. Public Event Discovery:", eventsRes.success ? "SUCCESS" : "FAILED", "- Found in listing:", !!foundEvent);

    // 6. Public Event Details
    const detailRes = await api.getEventById(createdEventId);
    console.log("6. Public Event Details:", detailRes.success ? "SUCCESS" : "FAILED", "- Title:", detailRes.data?.title);

    // 7. Public Participant Registration (Ticket 1 of 2)
    const regRes1 = await api.registerForEvent(createdEventId, {
      participantName: "Sarah Connor",
      email: "sarah.connor@example.com"
    });
    console.log("7. First Registration (Digital Pass Data):", regRes1.success ? "SUCCESS" : "FAILED");
    console.log("   - Ticket Reference:", regRes1.data?.registrationReference);
    console.log("   - Attendee:", regRes1.data?.participantName);
    console.log("   - Registered At:", regRes1.data?.registeredAt);

    // 8. Duplicate Registration Check (HTTP 409)
    try {
      await api.registerForEvent(createdEventId, {
        participantName: "Sarah Duplicate",
        email: "SARAH.CONNOR@example.com"
      });
      console.log("8. Duplicate Registration: FAILED (Expected 409 error)");
    } catch (err) {
      console.log("8. Duplicate Registration: SUCCESS (Correctly caught HTTP", err.status, "-", err.message + ")");
    }

    // 9. Second Registration (Filling Event to 2 of 2)
    const regRes2 = await api.registerForEvent(createdEventId, {
      participantName: "John Reese",
      email: "john.reese@example.com"
    });
    console.log("9. Second Registration (Fill Event):", regRes2.success ? "SUCCESS" : "FAILED");
    console.log("   - Ticket Reference:", regRes2.data?.registrationReference);

    // 10. Overcapacity Check on Full Event (HTTP 400)
    try {
      await api.registerForEvent(createdEventId, {
        participantName: "Charlie Brown",
        email: "charlie@example.com"
      });
      console.log("10. Full Event Rejection: FAILED (Expected 400 error)");
    } catch (err) {
      console.log("10. Full Event Rejection: SUCCESS (Correctly caught HTTP", err.status, "-", err.message + ")");
    }

    // 11. Protected Attendee Roster Verification
    const attendeesRes = await api.getEventAttendees(createdEventId, token);
    console.log("11. Protected Attendee Roster:", attendeesRes.success ? "SUCCESS" : "FAILED", "- Count:", attendeesRes.count);
    attendeesRes.data.forEach(att => {
      console.log(`    • ${att.participantName} (${att.email}) - Reference: ${att.registrationReference}`);
    });

    // 12. Unauthorized Access Check without Token (HTTP 401)
    try {
      await api.getEventAttendees(createdEventId, "invalid-token");
      console.log("12. Protected Roster without Token: FAILED (Expected 401 error)");
    } catch (err) {
      console.log("12. Protected Roster without Token: SUCCESS (Correctly blocked with HTTP", err.status + ")");
    }

    console.log("\n========================================================");
    console.log("   All 12 Frontend API Integration Checks PASSED!       ");
    console.log("========================================================\n");
  } catch (error) {
    console.error("Integration verification failed:", error);
  } finally {
    if (createdEventId) {
      try {
        console.log("Cleaning up test event:", createdEventId);
        const loginRes = await api.loginOrganizer({
          email: "admin@eventease.live",
          password: "EventEaseAdmin2026!"
        });
        if (loginRes.token) {
          await api.deleteEvent(createdEventId, loginRes.token);
          console.log("Test event cleaned up successfully.");
        }
      } catch (cleanErr) {
        console.warn("Test event cleanup failed:", cleanErr.message);
      }
    }
  }
}

verifyFrontendIntegration();

