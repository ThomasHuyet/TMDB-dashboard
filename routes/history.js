import express from "express";
import { MovieHistory } from "../models/MovieHistory.js";
import { GenreHistory } from "../models/GenreHistory.js";
import { TrendingHistory } from "../models/TrendingHistory.js";

const router = express.Router();

function getSinceDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function parseDays(raw, def = 30) {
  const n = Number(raw);
  return !n || n <= 0 ? def : n;
}

router.get("/movie/:movieId", async (req, res) => {
  const movieId = Number(req.params.movieId);
  const days = parseDays(req.query.days);

  try {
    const since = getSinceDate(days);

    const data = await MovieHistory.find({
      movieId,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .lean();

    res.json(data);
  } catch (err) {
    console.error("Erreur /history/movie :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/movie/:movieId/popularity", async (req, res) => {
  const movieId = Number(req.params.movieId);
  const days = parseDays(req.query.days);

  try {
    const since = getSinceDate(days);

    const data = await MovieHistory.find({
      movieId,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .lean();

    const formatted = data.map((d) => ({
      date: d.timestamp,
      popularity: d.popularity ?? 0
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Erreur /history/movie/popularity :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/genres", async (req, res) => {
  const days = parseDays(req.query.days);

  try {
    const since = getSinceDate(days);

    const data = await GenreHistory.find({
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .lean();

    res.json(data);
  } catch (err) {
    console.error("Erreur /history/genres :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/genres/avg-popularity", async (req, res) => {
  const days = parseDays(req.query.days);

  try {
    const since = getSinceDate(days);

    const docs = await GenreHistory.find({
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .lean();

    const byDate = {};

    docs.forEach((d) => {
      const key = d.timestamp.toISOString();

      if (!byDate[key]) {
        byDate[key] = {
          date: d.timestamp,
          byGenre: []
        };
      }

      byDate[key].byGenre.push({
        genreId: d.genreId,
        name: d.name,
        avgPopularity: d.avgPopularity
      });
    });

    res.json(Object.values(byDate));
  } catch (err) {
    console.error("Erreur /history/genres/avg-popularity :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/trending/:window", async (req, res) => {
  const window = req.params.window;
  const days = parseDays(req.query.days);

  if (!["day", "week"].includes(window)) {
    return res.status(400).json({ error: "window doit être day|week" });
  }

  try {
    const since = getSinceDate(days);

    const data = await TrendingHistory.find({
      trendingTimeWindow: window,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .lean();

    res.json(data);
  } catch (err) {
    console.error("Erreur /history/trending :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/trending/:window/count", async (req, res) => {
  const window = req.params.window;
  const days = parseDays(req.query.days);

  if (!["day", "week"].includes(window)) {
    return res.status(400).json({ error: "window doit être day|week" });
  }

  try {
    const since = getSinceDate(days);

    const aggregated = await TrendingHistory.aggregate([
      {
        $match: {
          trendingTimeWindow: window,
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: "$timestamp",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formatted = aggregated.map((a) => ({
      date: a._id,
      count: a.count
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Erreur /history/trending/count :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
