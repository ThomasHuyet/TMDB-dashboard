import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
  movieId: { type: Number, required: true, unique: true },
  title: String,
  popularity: Number,
  genres: [Number],
  overview: String,
  releaseDate: String,
  posterPath: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Movie = mongoose.model("Movie", movieSchema);
