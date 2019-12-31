// Put your Taste.io auth token here.
// Use Chrome Inspector to get it from your
const TASTE_TOKEN = "";

const REQUEST_LIMIT = 10;

const got = require("got");
const cookie = require("cookie");
const async = require("async");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const serializeCookie = obj => {
  return Object.keys(obj)
    .map(key => cookie.serialize(key, obj[key]))
    .join("; ");
};

const mapRating = rating => [null, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4][rating];

const adapter = new FileSync("movies.json");
const db = low(adapter);

db.defaults({ movies: [] }).write();

const movies = db
  .get("movies")
  .filter(({ tasteStatus }) => !tasteStatus)
  .value();

async.eachLimit(
  movies,
  REQUEST_LIMIT,
  async ({ letterboxdId: id, title, letterboxdRating }) => {
    const searchResponse = await got(
      `https://www.taste.io/api/movies/search?q=${encodeURIComponent(title)}`,
      {
        headers: {
          Authorization: `Bearer ${TASTE_TOKEN}`
        },
        responseType: "json"
      }
    );

    const [movie] = searchResponse.body.movies;

    if (!movie) {
      console.error(`NOT FOUND: ${title}`);
      return false;
    }

    const { name, slug } = movie;

    const cook = cookie.parse(searchResponse.headers["set-cookie"].join("; "));

    const updatedRating = mapRating(letterboxdRating);

    const ratingResponse = await got.post(
      `https://www.taste.io/api/movies/${slug}/rating`,
      {
        headers: {
          Authorization: `Bearer ${TASTE_TOKEN}`,
          Cookie: serializeCookie(cook),
          "X-XSRF-TOKEN": cook["XSRF-TOKEN"]
        },
        responseType: "json",
        json: {
          rating: updatedRating
        }
      }
    );

    console.log(`${title} - Rated "${name}"`, updatedRating);

    if (ratingResponse.statusCode < 200 || ratingResponse.statusCode >= 300) {
      console.error(`NOT RATED: ${title}`);
      return false;
    }

    db.get("movies")
      .find({ letterboxdId: id })
      .assign({
        tasteRating: updatedRating,
        tasteStatus: true
      })
      .write();

    return true;
  },
  (err, results) => {
    if (err) {
      console.error(err);
    }
  }
);
