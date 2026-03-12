# Movie Dashboard – TMDB Data Visualization

Projet web permettant d’afficher un dashboard interactif basé sur les données de l’API TMDB.  
Le site présente des informations sur les films (popularity, trending, upcoming…) et met automatiquement ses données à jour chaque jour.

---

## Fonctionnalités principales

- Dashboard web interactif (HTML/CSS/JS)
- Récupération des données TMDB via API
- Mise à jour automatique quotidienne (CRON)
- Stockage des données en base MongoDB
- Système d’historique (évolution de la popularité, trending, genres…)
- Chargement dynamique grâce à Socket.IO

---

## Prérequis

- Node.js (version 18+ recommandée)
- MongoDB (local ou MongoDB Atlas)
- Clé d’API TMDB (compte gratuit sur https://www.themoviedb.org)

---

## Installation

Cloner le projet :

```bash
git clone <url-du-repo>
cd JS_Project
npm install
````

Créer un fichier .env à la racine :

```env
MONGO_URI="mongodb://127.0.0.1:27017/tmdb"
TMDB_API_KEY="votre_clef_tmdb"
PORT=3000
```

Lancer le serveur :
```bash
npm start
```

Le site sera accessible à l’adresse suivante :
http://localhost:3000


## Initialisation de la base de données

Lors de la première utilisation, appeler l’URL suivante :
http://localhost:3000/api/save/all

Ce point d’entrée :
- remplit la base avec les données TMDB
- récupère les détails, crédits et mots-clés des films
- crée un premier historique

## Mise à jour automatique

Un cron intégré au serveur met à jour les données tous les jours à 16h30, puis met à jour l’historique automatiquement.
Aucune action supplémentaire n’est nécessaire.

## Interface Web

L’application web se trouve dans le dossier /public, et affiche le dashboard complet avec :
- statistiques
- filtres
- graphiques
- mode clair/sombre
- données mises à jour en temps réel

Aucune configuration supplémentaire n’est requise.

## Licence

Projet académique — usage pédagogique.
