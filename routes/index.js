import express from "express";
import genres from "./genres.js";
import movies from "./movies.js";
import stats from "./stats.js";
import save from "./save.js";
import history from "./history.js";

const router = express.Router();

router.use("/genres", genres);
router.use("/movies", movies);
router.use("/stats", stats);
router.use("/save", save);
router.use("/history", history);

export default router;
