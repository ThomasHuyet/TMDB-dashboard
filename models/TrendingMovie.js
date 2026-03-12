import mongoose from "mongoose";

const trendingMovieSchema = new mongoose.Schema({
  movieId: Number,
  title: String,
  overview: String,
  posterPath: String,
  popularity: Number,
  trendingTimeWindow: String
});

export const TrendingMovie = mongoose.model("TrendingMovie", trendingMovieSchema);
