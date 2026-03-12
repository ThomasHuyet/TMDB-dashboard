import mongoose from "mongoose";

const movieDetailSchema = new mongoose.Schema({
  movieId: Number,
  budget: Number,
  revenue: Number,
  runtime: Number,
  productionCompanies: Array,
  productionCountries: Array
});

export const MovieDetail = mongoose.model("MovieDetail", movieDetailSchema);
