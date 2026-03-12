import mongoose from "mongoose";

const GenreHistorySchema = new mongoose.Schema(
  {
    genreId: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    avgPopularity: { type: Number, default: 0 },
    movieCount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

GenreHistorySchema.index({ genreId: 1, timestamp: 1 });

export const GenreHistory = mongoose.model("GenreHistory", GenreHistorySchema);
