import express from "express";
import {
  saveGenres,
  savePopularMovies,
  saveUpcomingMovies,
  saveTrendingMovies,
  saveMovieDetails,
  saveMovieCredits,
  saveMovieKeywords,
  saveAllMovieData,
  saveAll
} from "../services/tmdb.js";

const router = express.Router();

router.get("/genres", async (req, res) => {
  await saveGenres();
  res.send("Genres OK");
});

router.get("/popular", async (req, res) => {
  await savePopularMovies();
  res.send("Popular OK");
});

router.get("/upcoming", async (req, res) => {
  await saveUpcomingMovies();
  res.send("Upcoming OK");
});

router.get("/trending/day", async (req, res) => {
  await saveTrendingMovies("day");
  res.send("Trending day OK");
});

router.get("/trending/week", async (req, res) => {
  await saveTrendingMovies("week");
  res.send("Trending week OK");
});

router.get("/movie/:id/details", async (req, res) => {
  await saveMovieDetails(req.params.id);
  res.send("Details OK");
});

router.get("/movie/:id/credits", async (req, res) => {
  await saveMovieCredits(req.params.id);
  res.send("Credits OK");
});

router.get("/movie/:id/keywords", async (req, res) => {
  await saveMovieKeywords(req.params.id);
  res.send("Keywords OK");
});

router.get("/movie/:id/all", async (req, res) => {
  await saveAllMovieData(req.params.id);
  res.send("All movie data OK");
});

router.get("/all", async (req, res) => {
  await saveAll();
  res.send("All TMDB data saved!");
});

export default router;
