import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import mongoose from "mongoose"; 

import routes from "./routes/index.js";

import { connectDB } from "./db/connect.js";
import {
  saveGenres,
  savePopularMovies,
  saveUpcomingMovies,
  saveTrendingMovies,
  saveMovieDetails,
  saveMovieCredits,
  saveMovieKeywords,
  saveAll,
  saveAllMovieData,
  syncDetailsForNewMovies,
  saveHistorySnapshot
} from "./services/tmdb.js";

dotenv.config();

// Création de l'application Express
const app = express();
const port = 3000;

// Création du serveur HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// evénement Socket.IO
io.on("connection", () => {
  console.log("🟢 Nouveau client connecté au WebSocket");
});


app.use(express.static("public"));
connectDB();

app.use("/api", routes);

cron.schedule("30 16 * * *", async () => {
  console.log("⏰ CRON 16h30 : mise à jour quotidienne TMDB (popular + trending + upcoming)");

  try {
    // 1) On met à jour les listes globales
    await savePopularMovies();
    await saveTrendingMovies("day");
    await saveTrendingMovies("week");
    await saveUpcomingMovies();
    await saveGenres();

    // 2) Ensuite, on complète les détails/credits/keywords manquants
    await syncDetailsForNewMovies();
    await saveHistorySnapshot();


    // 3) On notifie le front
    io.emit("dataUpdated", {
      message: "Mise à jour quotidienne TMDB + détails complétés pour les nouveaux films"
    });

    console.log("✅ Mise à jour TMDB + sync détails terminée (16h30)");
  } catch (err) {
    console.error("❌ Erreur CRON 16h30 :", err.message);
  }
});

//Fermeture propre de MongoDB quand on arrête le serveur (CTRL+C)
process.on("SIGINT", async () => {
  console.log("\n Arrêt du serveur...");

  await mongoose.connection.close();
  console.log("🔌 Connexion MongoDB fermée proprement.");

  process.exit(0);
});

server.listen(port, () => {
  console.log(` Serveur + Socket.IO sur http://localhost:${port}`);
});


