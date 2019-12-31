// Your Letterboxd username should be but here
const LETTERBOXD_USERNAME = "oan";

// Set this to true if you are up to date, but want to prepare your local cache for future use.
// When a movie is rated on Taste, your local cache will be changed to true for that movie
const TASTE_DEFAULT_STATUS = false;

const fs = require("fs");
const PromiseCrawler = require("promise-crawler");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("movies.json");
const db = low(adapter);

db.defaults({ movies: [] }).write();

const crawler = new PromiseCrawler({
  maxConnections: 10,
  retries: 3
});

const LETTERBOXD_FILMS_BASE = `https://letterboxd.com/${LETTERBOXD_USERNAME}/films/`;

let LETTERBOXD_MAX_PAGES = 0;

const movies = db.get("movies");

const getLetterboxdPage = ({ page }) =>
  crawler.request({
    url: `${LETTERBOXD_FILMS_BASE}${page > 1 ? `page/${page}/` : ""}`
  });

const handleLetterBoxdResponse = ({ $ }) => {
  if (!LETTERBOXD_MAX_PAGES) {
    LETTERBOXD_MAX_PAGES = parseInt(
      $(".paginate-page:last-child")
        .text()
        .trim()
    );
  }

  $(".poster-list > li").each((i, el) => {
    const $li = $(el);
    const $img = $("img.image", $li);
    const $poster = $(".film-poster", $li);

    const letterboxdId = parseInt($poster.data("filmId"));
    const letterboxdRating = parseInt($li.data("ownerRating"));
    const title = $img.attr("alt");

    const found = movies.find({ letterboxdId }).value();

    if (found) {
      movies
        .find({ letterboxdId })
        .assign({
          letterboxdRating,
          tasteStatus: TASTE_DEFAULT_STATUS
        })
        .write();
    } else {
      movies
        .push({
          letterboxdId,
          title,
          letterboxdRating,
          tasteStatus: TASTE_DEFAULT_STATUS
        })
        .write();
    }

    console.log(title, found ? "UPDATED" : "ADDED");
  });
};

(async () => {
  await crawler.setup();

  const res = await getLetterboxdPage({ page: 1 });
  handleLetterBoxdResponse(res);

  let pages = [];

  if (LETTERBOXD_MAX_PAGES > 1) {
    for (let i = 0; i < LETTERBOXD_MAX_PAGES - 1; i++) {
      pages.push(i + 2);
    }
  }

  const responses = await Promise.all(
    pages.map(pg => getLetterboxdPage({ page: pg }))
  );

  responses.forEach(handleLetterBoxdResponse);

  process.nextTick(() => crawler.destroy());
})();
