import mongoose from "mongoose";

const genreSchema = new mongoose.Schema({
  id: Number,
  name: String
});

export const Genre = mongoose.model("Genre", genreSchema);
