// Your Letterboxd username should be but here
const LETTERBOXD_USERNAME = "username";

// Set this to true if you are already up to date, but want to prepare your local cache for future use.
// When a movie is rated on Taste, your local cache will be changed to true for that movie
// Set the value to null if it should be unchanged on update
const TASTE_DEFAULT_STATUS = null;

const got = require("got");
const cheerio = require("cheerio");
const { findMovie, upsertMovie } = require("./db");

const LETTERBOXD_FILMS_BASE = `https://letterboxd.com/${LETTERBOXD_USERNAME}/films/`;

let LETTERBOXD_MAX_PAGES = 0;

const getLetterboxdPage = async ({ page }) => {
  const url = `${LETTERBOXD_FILMS_BASE}${page > 1 ? `page/${page}/` : ""}`;
  const response = await got(url, { retry: { limit: 3 } });
  const $ = cheerio.load(response.body);
  return { $ };
};

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
    const $ratingEl= $(".poster-viewingdata > .rating", $li);

    const letterboxdId = parseInt($poster.data("filmId"));

    let letterboxdRating = 0;
    if($ratingEl.prop('name') !== undefined){
        const ratingStr = $ratingEl.attr('class')
        letterboxdRating = parseInt(ratingStr.substring(ratingStr.lastIndexOf('-') + 1));
    }
    const title = $img.attr("alt");
    const found = findMovie(letterboxdId);

    const updatedObj = { title, letterboxdRating };

    if (TASTE_DEFAULT_STATUS !== null) {
      updatedObj.tasteStatus = !!TASTE_DEFAULT_STATUS;
    } else if (!found) {
      updatedObj.tasteStatus = false;
    }

    upsertMovie(letterboxdId, updatedObj);

    console.log(title, found ? "UPDATED" : "ADDED");
  });
};

(async () => {
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
})();
