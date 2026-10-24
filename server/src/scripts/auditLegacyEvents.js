import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Event from "../models/Event.js";
import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import Registration from "../models/Registration.js";

/**
 * EventEase - Safe Legacy Event Audit Script
 *
 * Inspects all events in the database to report:
 * 1. Events with verified organizer ownership.
 * 2. Unassigned / ownerless events (events with null or undefined organizer).
 * 3. Events with missing or legacy status fields.
 * 4. Active vs cancelled vs draft event counts and registrations.
 *
 * Safe & Read-Only: Never modifies or deletes any records.
 */
async function auditLegacyEvents() {
  console.log("\n========================================================");
  console.log("   EventEase — Safe Legacy Event Audit Report           ");
  console.log("========================================================\n");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not configured in server/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  try {
    const totalEvents = await Event.countDocuments({});
    const allEvents = await Event.find({}).lean();
    const allRegistrations = await Registration.countDocuments({});

    console.log(`📊 Total Database Records:`);
    console.log(`   • Total Events in Collection: ${totalEvents}`);
    console.log(`   • Total Registrations in Collection: ${allRegistrations}`);

    let ownedCount = 0;
    let ownerlessCount = 0;
    let missingStatusCount = 0;
    const statusBreakdown = {
      active: 0,
      published: 0,
      draft: 0,
      cancelled: 0,
      missing: 0
    };

    const ownerlessEvents = [];
    const missingStatusEvents = [];

    for (const ev of allEvents) {
      // Check status
      if (!ev.status) {
        statusBreakdown.missing++;
        missingStatusCount++;
        missingStatusEvents.push({
          id: ev._id.toString(),
          title: ev.title,
          registeredCount: ev.registeredCount,
          capacity: ev.capacity,
          createdAt: ev.createdAt
        });
      } else {
        statusBreakdown[ev.status] = (statusBreakdown[ev.status] || 0) + 1;
      }

      // Check organizer ownership
      if (!ev.organizer) {
        ownerlessCount++;
        ownerlessEvents.push({
          id: ev._id.toString(),
          title: ev.title,
          status: ev.status || "MISSING",
          registeredCount: ev.registeredCount,
          capacity: ev.capacity
        });
      } else {
        ownedCount++;
      }
    }

    console.log(`\n📋 Status Breakdown:`);
    console.log(`   • Active:     ${statusBreakdown.active}`);
    console.log(`   • Published:  ${statusBreakdown.published}`);
    console.log(`   • Draft:      ${statusBreakdown.draft}`);
    console.log(`   • Cancelled:  ${statusBreakdown.cancelled}`);
    console.log(`   • Missing:    ${statusBreakdown.missing}`);

    console.log(`\n🔐 Ownership Breakdown:`);
    console.log(`   • Events with verified organizer: ${ownedCount}`);
    console.log(`   • Ownerless events (unassigned):   ${ownerlessCount}`);

    if (missingStatusEvents.length > 0) {
      console.log(`\n⚠️  Legacy Events with Missing Status (${missingStatusEvents.length}):`);
      missingStatusEvents.forEach((e) => {
        console.log(`   • [ID: ${e.id}] "${e.title}" (Reg: ${e.registeredCount}/${e.capacity}) -> System rule: Defaults to 'active' unless marked cancelled.`);
      });
    }

    if (ownerlessEvents.length > 0) {
      console.log(`\n⚠️  Ownerless Events (${ownerlessEvents.length}):`);
      ownerlessEvents.slice(0, 10).forEach((e) => {
        console.log(`   • [ID: ${e.id}] "${e.title}" (Status: ${e.status}, Reg: ${e.registeredCount}/${e.capacity})`);
      });
      if (ownerlessEvents.length > 10) {
        console.log(`   ... and ${ownerlessEvents.length - 10} more ownerless events.`);
      }
    }

    console.log(`\n========================================================`);
    console.log(`   MIGRATION & GOVERNANCE RULES`);
    console.log(`========================================================`);
    console.log(`1. Ownerless events are strictly NOT assigned to arbitrary organizers.`);
    console.log(`2. Non-owners are forbidden from modifying or deleting ownerless events.`);
    console.log(`3. Legacy events with missing status safely default to 'active' in schema.`);
    console.log(`4. Legitimate historical records and registrations remain 100% intact.\n`);
  } finally {
    await mongoose.disconnect();
  }
}

auditLegacyEvents().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
