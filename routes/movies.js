import express from "express";
import { Movie } from "../models/Movie.js";
import { UpcomingMovie } from "../models/UpcomingMovie.js";
import { TrendingMovie } from "../models/TrendingMovie.js";
import { MovieDetail } from "../models/MovieDetail.js";
import { MovieCredits } from "../models/MovieCredits.js";
import { MovieKeywords } from "../models/MovieKeywords.js";
import { Genre } from "../models/Genre.js";

const router = express.Router();

router.get("/popular", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const movies = await Movie.find()
      .sort({ popularity: -1 })
      .limit(limit);

    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération films populaires" });
  }
});

router.get("/upcoming", async (req, res) => {
  try {
    const movies = await UpcomingMovie.find().sort({ releaseDate: 1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération films à venir" });
  }
});

router.get("/trending/day", async (req, res) => {
  try {
    const movies = await TrendingMovie.find({ trendingTimeWindow: "day" })
      .sort({ popularity: -1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: "Erreur trending day" });
  }
});

router.get("/trending/week", async (req, res) => {
  try {
    const movies = await TrendingMovie.find({ trendingTimeWindow: "week" })
      .sort({ popularity: -1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: "Erreur trending week" });
  }
});

router.get("/:id/details", async (req, res) => {
  try {
    const movieId = Number(req.params.id);
    const details = await MovieDetail.findOne({ movieId });

    if (!details) return res.status(404).json({ error: "Détails non trouvés" });

    res.json(details);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération détails" });
  }
});

router.get("/:id/credits", async (req, res) => {
  try {
    const movieId = Number(req.params.id);
    const credits = await MovieCredits.findOne({ movieId });

    if (!credits) return res.status(404).json({ error: "Crédits non trouvés" });

    res.json(credits);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération crédits" });
  }
});

router.get("/:id/keywords", async (req, res) => {
  try {
    const movieId = Number(req.params.id);
    const keywords = await MovieKeywords.findOne({ movieId });

    if (!keywords) return res.status(404).json({ error: "Mots-clés non trouvés" });

    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération mots-clés" });
  }
});

router.get("/top5bygenre/:genreId", async (req, res) => {
  try {
    const genreId = Number(req.params.genreId);

    const movies = await Movie.find({ genres: genreId })
      .sort({ popularity: -1 })
      .limit(5);

    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: "Erreur top 5 genre" });
  }
});

router.get("/top5bygenre/all", async (req, res) => {
  try {
    const genres = await Genre.find();

    const result = [];

    for (const g of genres) {
      const movies = await Movie.find({ genres: g.id })
        .sort({ popularity: -1 })
        .limit(5);

      result.push({
        genreId: g.id,
        name: g.name,
        movies,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur top 5 global" });
  }
});

export default router;
