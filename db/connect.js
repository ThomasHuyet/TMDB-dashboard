import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "tmdb_dashboard",
    });
    console.log("📦 MongoDB connectée !");
  } catch (err) {
    console.error("❌ Erreur MongoDB :", err.message);
  }
}
