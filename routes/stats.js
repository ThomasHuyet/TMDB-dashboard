import express from "express";
import { MovieDetail } from "../models/MovieDetail.js";
import { Movie } from "../models/Movie.js";
import { MovieCredits } from "../models/MovieCredits.js";
import { MovieKeywords } from "../models/MovieKeywords.js";
import { Genre } from "../models/Genre.js";
import { UpcomingMovie } from "../models/UpcomingMovie.js";

const router = express.Router();

router.get("/budget-revenue", async (req, res) => {
  try {
    const details = await MovieDetail.find({
      budget: { $gt: 0 },
      revenue: { $gt: 0 }
    });

    const movies = await Movie.find();
    const movieMap = Object.fromEntries(movies.map(m => [m.movieId, m]));

    const result = details.map(d => ({
      movieId: d.movieId,
      title: movieMap[d.movieId]?.title || "Inconnu",
      budget: d.budget,
      revenue: d.revenue,
      popularity: movieMap[d.movieId]?.popularity ?? 0
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur /api/stats/budget-revenue :", err.message);
    res.status(500).json({ error: "Erreur stats budget-revenue" });
  }
});

router.get("/top-actors", async (req, res) => {
  try {
    const credits = await MovieCredits.find();
    const count = {};

    credits.forEach(c => {
      c.cast.forEach(a => {
        count[a.name] = (count[a.name] || 0) + 1;
      });
    });

    const top = Object.entries(count)
      .map(([name, appearances]) => ({ name, appearances }))
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 20);

    res.json(top);
  } catch (err) {
    console.error("Erreur /api/stats/top-actors :", err.message);
    res.status(500).json({ error: "Erreur stats acteurs" });
  }
});

router.get("/keywords", async (req, res) => {
  try {
    const keywords = await MovieKeywords.find();
    const count = {};

    keywords.forEach(k => {
      k.keywords.forEach(kw => {
        count[kw.name] = (count[kw.name] || 0) + 1;
      });
    });

    const top = Object.entries(count)
      .map(([name, occurrences]) => ({ name, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 30);

    res.json(top);
  } catch (err) {
    console.error("Erreur /api/stats/keywords :", err.message);
    res.status(500).json({ error: "Erreur stats mots-clés" });
  }
});

router.get("/genre-popularity", async (req, res) => {
  try {
    const movies = await Movie.find();
    const genres = await Genre.find();

    const genreStats = {};

    genres.forEach(g => {
      genreStats[g.id] = { name: g.name, sum: 0, count: 0 };
    });

    movies.forEach(m => {
      m.genres.forEach(gid => {
        if (genreStats[gid]) {
          genreStats[gid].sum += m.popularity;
          genreStats[gid].count += 1;
        }
      });
    });

    const result = Object.values(genreStats)
      .map(g => ({
        name: g.name,
        avgPopularity: g.count > 0 ? g.sum / g.count : 0
      }))
      .sort((a, b) => b.avgPopularity - a.avgPopularity);

    res.json(result);
  } catch (err) {
    console.error("Erreur /api/stats/genre-popularity :", err.message);
    res.status(500).json({ error: "Erreur stats popularité genre" });
  }
});

router.get("/upcoming/calendar", async (req, res) => {
  try {
    const movies = await UpcomingMovie.find().sort({ releaseDate: 1 });

    const result = movies.map(m => ({
      title: m.title,
      date: m.releaseDate,
      popularity: m.popularity,
      posterPath: m.posterPath
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur /api/stats/upcoming/calendar :", err.message);
    res.status(500).json({ error: "Erreur calendrier sorties" });
  }
});

router.get("/upcoming/popularity", async (req, res) => {
  try {
    const movies = await UpcomingMovie.find().lean();

    if (!movies || !movies.length)
      return res.json([]);

    const ranges = [
      { label: "0–10", min: 0, max: 10 },
      { label: "10–30", min: 10, max: 30 },
      { label: "30–60", min: 30, max: 60 },
      { label: "60–100", min: 60, max: 100 },
      { label: "100+", min: 100, max: Infinity },
    ];

    const result = ranges.map(r => ({
      label: r.label,
      count: movies.filter(m =>
        typeof m.popularity === "number" &&
        m.popularity >= r.min &&
        m.popularity < r.max
      ).length,
    }));

    res.json(result);

  } catch (err) {
    console.error("❌ Failed to compute upcoming popularity", err);
    res.status(500).json({ error: "Failed to compute upcoming popularity" });
  }
});



export default router;
