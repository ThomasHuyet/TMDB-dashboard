import mongoose from "mongoose";

const upcomingMovieSchema = new mongoose.Schema({
  movieId: Number,
  title: String,
  releaseDate: String,
  overview: String,
  posterPath: String,
  popularity: Number
});

export const UpcomingMovie = mongoose.model("UpcomingMovie", upcomingMovieSchema);
