import mongoose from "mongoose";

const movieKeywordsSchema = new mongoose.Schema({
  movieId: Number,
  keywords: Array
});

export const MovieKeywords = mongoose.model("MovieKeywords", movieKeywordsSchema);
