# Letterboxd Ratings Exporter

Export your movie ratings from [Letterboxd](https://letterboxd.com) to a local JSON file, and optionally import them into [Taste.io](https://taste.io).

## Table of Contents

- [What It Does](#what-it-does)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Exporting Ratings from Letterboxd](#exporting-ratings-from-letterboxd)
- [Importing Ratings to Taste.io](#importing-ratings-to-tasteio)
- [Running Export and Import Together](#running-export-and-import-together)
- [Understanding the Local Database](#understanding-the-local-database)
- [Troubleshooting](#troubleshooting)

## What It Does

This tool scrapes your public Letterboxd profile to collect all your film ratings and saves them to a local `movies.json` file. It handles pagination automatically, so it works no matter how many films you've rated.

You can then optionally import those ratings into Taste.io. The importer maps Letterboxd's 10-point rating scale to Taste.io's 4-point scale:

| Letterboxd Rating | Taste.io Rating |
| --- | --- |
| 1 - 3 | 1 |
| 4 - 5 | 2 |
| 6 - 7 | 3 |
| 8 - 10 | 4 |

Unrated films (0) are skipped during import.

## Prerequisites

- [Node.js](https://nodejs.org) (v12 or later)
- npm (included with Node.js)
- A public Letterboxd profile with rated films

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/johanhermansson/letterboxd-exporter.git
cd letterboxd-exporter
npm install
```

## Exporting Ratings from Letterboxd

### 1. Set your username

Open `letterboxd-export.js` and change the `LETTERBOXD_USERNAME` variable to your Letterboxd username:

```js
const LETTERBOXD_USERNAME = "your-username";
```

### 2. Choose the update mode

In the same file, set the `TASTE_DEFAULT_STATUS` variable to control how the export behaves:

- **`null`** (default, recommended) — Smart mode. Only marks movies as needing import if they haven't been imported before. This is the best option for ongoing use.
- **`true`** — Marks all movies as already imported. Useful if you've already synced your ratings to Taste.io manually and just want to build the local cache.
- **`false`** — Marks all movies as needing import. Use this to force a full re-import on the next Taste.io import run.

```js
const TASTE_DEFAULT_STATUS = null;
```

### 3. Run the export

```bash
npm run letterboxd-export
```

The script fetches each page of your film library and logs progress to the console:

```
Movie Title ADDED
Another Movie UPDATED
```

When finished, your ratings are saved in `movies.json` in the project folder.

## Importing Ratings to Taste.io

### 1. Get your Taste.io authorization token

You need a token from Taste.io to authenticate API requests. To get it:

1. Log in to [taste.io](https://taste.io) in your browser.
2. Go to your home page.
3. Open your browser's Developer Tools (F12 or right-click > Inspect).
4. Switch to the **Network** tab.
5. Refresh the page.
6. Find the request to the `/me` endpoint in the network list.
7. Click on it and go to the **Headers** tab.
8. Copy the value of the `Authorization` header, **without** the `Bearer ` prefix.

![How to find the token in Chrome DevTools](/images/taste-chrome-example.png)

### 2. Set the token

Open `taste-import.js` and paste your token into the `TASTE_TOKEN` variable:

```js
const TASTE_TOKEN = "paste-your-token-here";
```

### 3. Run the import

```bash
npm run taste-import
```

The script reads `movies.json`, searches for each unimported movie on Taste.io, and submits your rating. Progress is logged to the console:

```
Movie Title - Rated "Movie Title on Taste" 3
```

If a movie can't be found or rated, you'll see one of these messages:

- `NOT FOUND: Movie Title` — The movie wasn't found on Taste.io.
- `NOT RATED: Movie Title` — The movie has no Letterboxd rating or the import failed.

Imports are rate-limited (10 concurrent requests) to avoid overloading the Taste.io API.

## Running Export and Import Together

If you want to export from Letterboxd and immediately import any new ratings to Taste.io in one step:

```bash
npm start
```

This runs the exporter first, then the importer. It's recommended to use `TASTE_DEFAULT_STATUS = null` for this workflow so only new or updated ratings get imported.

## Understanding the Local Database

The `movies.json` file acts as a local database that tracks the state of each movie:

```json
{
  "letterboxdId": "film-id",
  "title": "Movie Title",
  "letterboxdRating": 8,
  "tasteStatus": true,
  "tasteRating": 4
}
```

| Field | Description |
| --- | --- |
| `letterboxdId` | Unique film identifier from Letterboxd |
| `title` | Movie title |
| `letterboxdRating` | Your Letterboxd rating (0-10, where 0 means unrated) |
| `tasteStatus` | Whether the rating has been imported to Taste.io |
| `tasteRating` | The mapped rating on Taste.io (1-4) |

This file is listed in `.gitignore` and won't be committed to version control.

## Troubleshooting

**No movies are being exported**
- Make sure your Letterboxd profile is public.
- Double-check that `LETTERBOXD_USERNAME` matches your profile URL exactly (e.g., `letterboxd.com/yourusername`).

**Taste.io token isn't working**
- Tokens expire. If the import fails with authentication errors, get a fresh token from your browser.
- Make sure you copied only the token value, without the `Bearer ` prefix.

**`NOT FOUND` for many movies**
- Taste.io may not have all the same films as Letterboxd. These movies are skipped and can be rated manually.

**Network errors**
- The script retries failed requests up to 3 times automatically. If errors persist, check your internet connection and try again.
