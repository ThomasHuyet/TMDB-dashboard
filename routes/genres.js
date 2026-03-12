import express from "express";
import { Genre } from "../models/Genre.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });
    res.json(genres);
  } catch (err) {
    console.error("Erreur /api/genres :", err.message);
    res.status(500).json({ error: "Erreur récupération genres" });
  }
});

export default router;
