import axios from "axios";
import { Genre } from "../models/Genre.js";
import { Movie } from "../models/Movie.js";
import { MovieDetail } from "../models/MovieDetail.js";
import { MovieCredits } from "../models/MovieCredits.js";
import { MovieKeywords } from "../models/MovieKeywords.js";
import { UpcomingMovie } from "../models/UpcomingMovie.js";
import { TrendingMovie } from "../models/TrendingMovie.js";
import { MovieHistory } from "../models/MovieHistory.js";
import { GenreHistory } from "../models/GenreHistory.js";
import { TrendingHistory } from "../models/TrendingHistory.js";


const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

// ---- NOUVELLE FONCTION : récupère plusieurs pages ----
async function fetchAllPages(path, pages = 5) {
  let allResults = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const response = await axios.get(
        `${TMDB_BASE}${path}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR&page=${page}`
      );

      if (!response.data.results) break;

      allResults.push(...response.data.results);

    } catch (err) {
      console.error(`Erreur API TMDB page ${page} :`, err.message);
      break;
    }
  }

  return allResults;
}


export async function saveGenres() {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`
    );
    console.log("DEBUG TMDB KEY:", API_KEY);

    const genres = response.data.genres;

    for (const g of genres) {
      await Genre.findOneAndUpdate(
        { id: g.id },
        {
          id: g.id,
          name: g.name
        },
        { upsert: true }
      );
    }

    console.log("📚 Genres enregistrés !");
  } catch (err) {
    console.error("❌ Erreur saveGenres:", err.message);
  }
}

// ---- NOW FETCHING MULTIPLE PAGES ----
export async function saveUpcomingMovies() {
  try {
    const movies = await fetchAllPages("/movie/upcoming", 10); // 5 pages

    for (const m of movies) {
      await UpcomingMovie.findOneAndUpdate(
        { movieId: m.id },
        {
          movieId: m.id,
          title: m.title,
          overview: m.overview,
          releaseDate: m.release_date,
          posterPath: m.poster_path,
          popularity: m.popularity
        },
        { upsert: true }
      );
    }

    console.log(`🎬 ${movies.length} films à venir enregistrés !`);
  } catch (err) {
    console.error("❌ Erreur saveUpcomingMovies:", err.message);
  }
}

export async function savePopularMovies() {
  try {
    const movies = await fetchAllPages("/movie/popular", 30); // 10 pages (≈ 200 films)

    for (const m of movies) {
      await Movie.findOneAndUpdate(
        { movieId: m.id },
        {
          movieId: m.id,
          title: m.title,
          popularity: m.popularity,
          genres: m.genre_ids,
          overview: m.overview,
          releaseDate: m.release_date,
          posterPath: m.poster_path
        },
        { upsert: true }
      );
    }

    console.log(`🎬 ${movies.length} films populaires enregistrés !`);
  } catch (err) {
    console.error("❌ Erreur savePopularMovies:", err.message);
  }
}

export async function saveTrendingMovies(timeWindow = "day") {
  try {
    const movies = await fetchAllPages(`/trending/movie/${timeWindow}`, 10); // 7 pages

    for (const m of movies) {
      await TrendingMovie.findOneAndUpdate(
        { movieId: m.id, trendingTimeWindow: timeWindow },
        {
          movieId: m.id,
          trendingTimeWindow: timeWindow,
          title: m.title,
          overview: m.overview,
          posterPath: m.poster_path,
          popularity: m.popularity
        },
        { upsert: true }
      );
    }

    console.log(`🔥 ${movies.length} films trending (${timeWindow}) enregistrés !`);
  } catch (err) {
    console.error("❌ Erreur saveTrendingMovies:", err.message);
  }
}

export async function saveMovieDetails(movieId) {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`
    );

    const d = response.data;

    await MovieDetail.findOneAndUpdate(
      { movieId },
      {
        movieId,
        budget: d.budget,
        revenue: d.revenue,
        runtime: d.runtime,
        productionCompanies: d.production_companies,
        productionCountries: d.production_countries
      },
      { upsert: true }
    );

  } catch (err) {
    console.error("❌ Erreur saveMovieDetails:", err.message);
  }
}

export async function saveMovieCredits(movieId) {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`
    );

    const { cast, crew } = response.data;

    await MovieCredits.findOneAndUpdate(
      { movieId },
      { movieId, cast, crew },
      { upsert: true }
    );

  } catch (err) {
    console.error("❌ Erreur saveMovieCredits:", err.message);
  }
}

export async function saveMovieKeywords(movieId) {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}/keywords?api_key=${process.env.TMDB_API_KEY}`
    );

    const keywords = response.data.keywords;

    await MovieKeywords.findOneAndUpdate(
      { movieId },
      { movieId, keywords },
      { upsert: true }
    );

  } catch (err) {
    console.error("❌ Erreur saveMovieKeywords:", err.message);
  }
}

export async function saveAllMovieData(movieId) {
  await saveMovieDetails(movieId);
  await saveMovieCredits(movieId);
  await saveMovieKeywords(movieId);
}

export async function saveAll() {
  await saveGenres();
  await savePopularMovies();
  await saveUpcomingMovies();
  await saveTrendingMovies("day");
  await saveTrendingMovies("week");

  const popularMovies = await Movie.find();

  for (const m of popularMovies) {
    await saveAllMovieData(m.movieId);
  }

  console.log("🚀 Sauvegarde complète terminée !");

    // 🔥 AJOUT : on enregistre l’historique
  await saveHistorySnapshot();
  console.log("📊 Historique ajouté après saveAll()");

}

export async function syncDetailsForNewMovies() {
  const movies = await Movie.find();

  for (const m of movies) {
    const movieId = m.movieId;

    const details = await MovieDetail.findOne({ movieId });
    const credits = await MovieCredits.findOne({ movieId });
    const keywords = await MovieKeywords.findOne({ movieId });

    if (details && credits && keywords) continue;

    console.log(`🔎 Données manquantes pour le film ${movieId}, on complète...`);
    await saveAllMovieData(movieId);
  }

  console.log("✅ Synchronisation terminée");
}

// Calcul des stats de popularité par genre à partir des collections Movie + Genre
async function computeGenrePopularityFromDB() {
  const movies = await Movie.find();
  const genres = await Genre.find();

  const genreStats = {};

  // Init
  genres.forEach((g) => {
    genreStats[g.id] = {
      id: g.id,
      name: g.name,
      sum: 0,
      count: 0,
    };
  });

  movies.forEach((m) => {
    const popularity = m.popularity || 0;
    (m.genres || []).forEach((gid) => {
      if (genreStats[gid]) {
        genreStats[gid].sum += popularity;
        genreStats[gid].count += 1;
      }
    });
  });

  return Object.values(genreStats).map((g) => ({
    genreId: g.id,
    name: g.name,
    avgPopularity: g.count > 0 ? g.sum / g.count : 0,
    movieCount: g.count,
  }));
}

export async function saveHistorySnapshot() {
  const timestamp = new Date();
  console.log("🕒 Enregistrement de l'historique TMDB au", timestamp.toISOString());

  // 1) Films populaires
  const popularMovies = await Movie.find();
  if (popularMovies.length) {
    const docsMovies = popularMovies.map((m) => ({
      movieId: m.movieId,
      title: m.title,
      popularity: m.popularity,
      timestamp,
    }));
    await MovieHistory.insertMany(docsMovies);
    console.log(`📊 Historique MovieHistory : ${docsMovies.length} entrées`);
  } else {
    console.log("📊 Historique MovieHistory : aucun film populaire trouvé");
  }

  // 2) Genres (popularité moyenne + nb films)
  const genresStats = await computeGenrePopularityFromDB();
  if (genresStats.length) {
    const docsGenres = genresStats.map((g) => ({
      genreId: g.genreId,
      name: g.name,
      avgPopularity: g.avgPopularity,
      movieCount: g.movieCount,
      timestamp,
    }));
    await GenreHistory.insertMany(docsGenres);
    console.log(`📊 Historique GenreHistory : ${docsGenres.length} entrées`);
  } else {
    console.log("📊 Historique GenreHistory : aucun genre calculé");
  }

  // 3) Trending (day + week)
  const trendingMovies = await TrendingMovie.find();
  if (trendingMovies.length) {
    const docsTrending = trendingMovies.map((t) => ({
      movieId: t.movieId,
      title: t.title,
      trendingTimeWindow: t.trendingTimeWindow,
      popularity: t.popularity,
      timestamp,
    }));
    await TrendingHistory.insertMany(docsTrending);
    console.log(`📊 Historique TrendingHistory : ${docsTrending.length} entrées`);
  } else {
    console.log("📊 Historique TrendingHistory : aucun film trending trouvé");
  }

  console.log("✅ Snapshot historique terminé");
}
