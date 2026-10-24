import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Registration from "../src/models/Registration.js";
import SavedEvent from "../src/models/SavedEvent.js";

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("[Migration] Connected to MongoDB Atlas");

    // 1. Ensure indexes are created
    await SavedEvent.createIndexes();
    await Registration.createIndexes();
    console.log("[Migration] Indexes built successfully");

    // 2. Inspect all registrations
    const allRegistrations = await Registration.find({});
    console.log(`[Migration] Total registrations found: ${allRegistrations.length}`);

    let linkedCount = 0;
    let alreadyLinkedCount = 0;
    const unlinkedAmbiguous = [];

    for (const reg of allRegistrations) {
      if (reg.student) {
        alreadyLinkedCount++;
        continue;
      }

      // Check if there is an exact verified student user match by email
      const studentUser = await User.findOne({
        email: reg.email.toLowerCase().trim()
      });

      if (studentUser) {
        reg.student = studentUser._id;
        await reg.save();
        linkedCount++;
        console.log(`[Migration] Linked registration ${reg.registrationReference} (${reg.email}) to student user ${studentUser.name} (${studentUser._id})`);
      } else {
        unlinkedAmbiguous.push({
          registrationId: reg._id.toString(),
          reference: reg.registrationReference,
          email: reg.email,
          participantName: reg.participantName
        });
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Already linked: ${alreadyLinkedCount}`);
    console.log(`Newly linked: ${linkedCount}`);
    console.log(`Unlinked (No registered student account exists for this email): ${unlinkedAmbiguous.length}`);
    if (unlinkedAmbiguous.length > 0) {
      console.log("Unlinked registrations:", JSON.stringify(unlinkedAmbiguous, null, 2));
    }

    await mongoose.disconnect();
    console.log("[Migration] Disconnected from MongoDB");
  } catch (err) {
    console.error("[Migration] Error:", err);
    process.exit(1);
  }
}

runMigration();
