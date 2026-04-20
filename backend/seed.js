// seed.js — creează/upsertează user-ul `nico` cu parola `sticlimarci`.
// Rulează o dată, local sau pe Render: `npm run seed`.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI lipsește.");
  process.exit(1);
}

const USERNAME = "nico";
const PASSWORD = "sticlimarci";
const DISPLAY_NAME = "Nico";

await mongoose.connect(MONGO_URI);

const passwordHash = await bcrypt.hash(PASSWORD, 10);

const result = await User.findOneAndUpdate(
  { username: USERNAME },
  { username: USERNAME, passwordHash, displayName: DISPLAY_NAME },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

console.log(`✅ User seed-uit: ${result.username} (${result.displayName})`);
await mongoose.disconnect();
