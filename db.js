const fs = require("fs");

const DB_FILE = "movies.json";

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ movies: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getMovies() {
  return readDb().movies;
}

function findMovie(letterboxdId) {
  return getMovies().find((m) => m.letterboxdId === letterboxdId) || null;
}

function upsertMovie(letterboxdId, data) {
  const db = readDb();
  const index = db.movies.findIndex((m) => m.letterboxdId === letterboxdId);
  if (index >= 0) {
    Object.assign(db.movies[index], data);
  } else {
    db.movies.push({ letterboxdId, ...data });
  }
  writeDb(db);
}

module.exports = { getMovies, findMovie, upsertMovie };
