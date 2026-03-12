import mongoose from "mongoose";

const TrendingHistorySchema = new mongoose.Schema(
  {
    movieId: { type: Number, required: true, index: true },
    title: { type: String },
    trendingTimeWindow: {
      type: String,
      enum: ["day", "week"],
      required: true,
      index: true,
    },
    popularity: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

TrendingHistorySchema.index({ trendingTimeWindow: 1, timestamp: 1 });
TrendingHistorySchema.index({ movieId: 1, trendingTimeWindow: 1, timestamp: 1 });

export const TrendingHistory = mongoose.model(
  "TrendingHistory",
  TrendingHistorySchema
);
