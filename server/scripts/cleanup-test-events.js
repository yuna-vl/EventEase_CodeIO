import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import Notification from "../src/models/Notification.js";
import SavedEvent from "../src/models/SavedEvent.js";
import User from "../src/models/User.js";

async function inspectAndCleanup() {
  const isConfirm = process.argv.includes("--confirm");

  console.log("\n========================================================");
  console.log("   EventEase — Safe Test Event Inspection & Cleanup    ");
  console.log("========================================================");
  console.log(`Mode: ${isConfirm ? "🔴 LIVE DELETION (--confirm)" : "🟢 DRY RUN (Inspect Only)"}\n`);

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in server/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.\n");

  const allEvents = await Event.find({}).lean();
  console.log(`Total events currently in database: ${allEvents.length}`);

  // Test patterns strictly identifying automated test artifacts:
  // 1. "Isolation Test Event [A-D]..."
  // 2. "Quantum Computing Symposium <timestamp>"
  // 3. "Authorized Event <timestamp>"
  // 4. "AI & Distributed Systems Workshop <timestamp>"
  // 5. "Corrupt Role Event"
  const testTitleRegex = /^(Isolation Test Event [A-D]|Quantum Computing Symposium \d+|Authorized Event \d+|AI & Distributed Systems Workshop \d+|Corrupt Role Event)/;

  const testEvents = [];
  const legitimateEvents = [];

  for (const ev of allEvents) {
    const isTestTitle = testTitleRegex.test(ev.title);
    if (isTestTitle) {
      testEvents.push(ev);
    } else {
      legitimateEvents.push(ev);
    }
  }

  console.log("\n--- Legitimate Events (Preserved & Untouched) ---");
  if (legitimateEvents.length === 0) {
    console.log("  (None)");
  } else {
    legitimateEvents.forEach((ev, i) => {
      console.log(`  ${i + 1}. [${ev.status || "active"}] "${ev.title}" (ID: ${ev._id})`);
    });
  }

  console.log(`\n--- Confirmed Test Events Identified: ${testEvents.length} ---`);
  if (testEvents.length === 0) {
    console.log("  No test events matching pattern found.");
  } else {
    testEvents.forEach((ev, i) => {
      console.log(`  ${i + 1}. ID: ${ev._id} | Title: "${ev.title}" | CreatedAt: ${ev.createdAt}`);
    });
  }

  if (testEvents.length > 0) {
    const testEventIds = testEvents.map(e => e._id);
    const relatedRegs = await Registration.countDocuments({ event: { $in: testEventIds } });
    const relatedNotifs = await Notification.countDocuments({ event: { $in: testEventIds } });
    const relatedSaved = await SavedEvent.countDocuments({ event: { $in: testEventIds } });
    console.log(`\nRelated test records found: ${relatedRegs} registrations, ${relatedNotifs} notifications, ${relatedSaved} saved events.`);

    if (isConfirm) {
      console.log("\nDeleting identified test events and test registrations...");
      const deletedEvents = await Event.deleteMany({ _id: { $in: testEventIds } });
      const deletedRegs = await Registration.deleteMany({ event: { $in: testEventIds } });
      const deletedNotifs = await Notification.deleteMany({ event: { $in: testEventIds } });
      const deletedSaved = await SavedEvent.deleteMany({ event: { $in: testEventIds } });

      console.log(`✅ Cleanup Complete:`);
      console.log(`   - Deleted ${deletedEvents.deletedCount} test events`);
      console.log(`   - Deleted ${deletedRegs.deletedCount} test registrations`);
      console.log(`   - Deleted ${deletedNotifs.deletedCount} test notifications`);
      console.log(`   - Deleted ${deletedSaved.deletedCount} test saved events`);
    } else {
      console.log("\n⚠️  DRY RUN ONLY. No records were modified or deleted.");
      console.log("To safely delete ONLY the confirmed test events listed above, run:");
      console.log("node server/scripts/cleanup-test-events.js --confirm\n");
    }
  }

  await mongoose.disconnect();
}

inspectAndCleanup().catch(err => {
  console.error("Error during cleanup script:", err);
  process.exit(1);
});
