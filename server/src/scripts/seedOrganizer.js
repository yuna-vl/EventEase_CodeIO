import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Organizer from "../models/Organizer.js";
import User from "../models/User.js";

/**
 * One-Time Organizer Seed Script
 * Reads credentials from environment variables and safely seeds an initial Organizer.
 * Refuses to overwrite if an account with the same email already exists.
 */
const seedOrganizer = async () => {
  console.log("\n========================================================");
  console.log("       EventEase Live - Initial Organizer Seed          ");
  console.log("========================================================\n");

  const email = process.env.INITIAL_ORGANIZER_EMAIL || process.env.ORGANIZER_EMAIL;
  const password = process.env.INITIAL_ORGANIZER_PASSWORD || process.env.ORGANIZER_PASSWORD;
  const name = process.env.INITIAL_ORGANIZER_NAME || process.env.ORGANIZER_NAME || "EventEase Admin";

  if (!email || !password) {
    console.error("[Seed Error] INITIAL_ORGANIZER_EMAIL and INITIAL_ORGANIZER_PASSWORD must be defined in server/.env");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    await connectDB();

    // 1. Check if an organizer with this email already exists in Organizer collection
    let existingOrganizer = await Organizer.findOne({ email: normalizedEmail });
    if (!existingOrganizer) {
      existingOrganizer = await Organizer.create({
        name: name.trim(),
        email: normalizedEmail,
        password: password
      });
      console.log(`[Seed Success] Created organizer in Organizer collection: ${existingOrganizer.email}`);
    } else {
      console.log(`[Seed Info] Organizer already exists in Organizer collection: ${normalizedEmail}`);
    }

    // 2. Also ensure presence in User collection with persistent role='organizer'
    let existingUser = await User.findOne({ email: normalizedEmail });
    if (!existingUser) {
      existingUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: password,
        role: "organizer"
      });
      console.log(`[Seed Success] Created organizer in User collection with role='organizer': ${existingUser.email}`);
    } else {
      if (existingUser.role !== "organizer") {
        existingUser.role = "organizer";
        await existingUser.save();
        console.log(`[Seed Info] Updated existing user ${normalizedEmail} to role='organizer'`);
      } else {
        console.log(`[Seed Info] User ${normalizedEmail} already verified as organizer.`);
      }
    }

    console.log("\n========================================================\n");
  } catch (error) {
    console.error("[Seed Error] Failed to seed organizer:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedOrganizer();
