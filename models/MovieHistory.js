import mongoose from "mongoose";

const MovieHistorySchema = new mongoose.Schema(
  {
    movieId: { type: Number, required: true, index: true },
    title: { type: String },
    popularity: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
  }
);

MovieHistorySchema.index({ movieId: 1, timestamp: 1 });

export const MovieHistory = mongoose.model("MovieHistory", MovieHistorySchema);
