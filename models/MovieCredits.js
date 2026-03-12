import mongoose from "mongoose";

const movieCreditsSchema = new mongoose.Schema({
  movieId: Number,
  cast: Array,
  crew: Array
});

export const MovieCredits = mongoose.model("MovieCredits", movieCreditsSchema);
