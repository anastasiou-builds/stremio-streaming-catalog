# Streaming Catalog — Stremio Addon

Lists movies & TV series available on major streaming platforms (Netflix, Prime Video, Disney+, Hulu, Max, Apple TV+, Paramount+, Peacock, Discovery+) using the TMDB API.

## Features

- **9 providers** × **2 types** (Movies/Series) = **18 catalogs**, each with **3 sort modes** (Popular / Latest / Top Rated)
- **100 results per Stremio page** with proper pagination
- **Search** support (type in Stremio's search bar)
- **Genre** filtering with separate movie and TV genre lists
- **Enhanced metadata** — cast, director, writers, runtime, trailers, streaming service info, IMDb links
- **Graceful error handling** — addon stays up even if TMDB requests fail
- **Vercel-ready** — deploys as a serverless function

## Files

- `addon.js` — shared addon logic (used by local server and Vercel)
- `index.js` — local Node.js server entry point
- `api/index.js` — Vercel serverless function entry point
- `vercel.json` — Vercel routing configuration
- `package.json` — dependencies
- `.env` — TMDB API key (not committed if you use the included `.gitignore`)
- `start.sh` — convenience startup script
- `README.md` — this file

## Setup

1. Get a free TMDB API key at https://www.themoviedb.org/settings/api
2. Copy `.env.example` to `.env` and add your key
3. Run `npm install`
4. Start locally: `node index.js` or `./start.sh`

## Running locally

```bash
# Manual
node index.js

# Via start script
./start.sh
```

## Install in Stremio (local)

Add `http://localhost:7000/manifest.json` in Stremio → Addons → Install from URL.

## Deploy to Vercel

This addon is ready to deploy on Vercel's free tier.

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) and **Import Project** → select your GitHub repo.
3. In the project settings, add an environment variable:
   - Name: `TMDB_API_KEY`
   - Value: your TMDB API key
4. Deploy.
5. Vercel will give you a URL like `https://your-project.vercel.app`.
6. Install in Stremio using: `https://your-project.vercel.app/manifest.json`

## API Endpoints

| Endpoint | Description |
|---|---|
| `/manifest.json` | Addon manifest |
| `/catalog/movie/{provider}_movie.json` | Movie catalog |
| `/catalog/series/{provider}_series.json` | Series catalog |
| `/meta/{type}/{id}.json` | Metadata |
| `/stream/{type}/{id}.json` | Streaming availability links |

Supported sorts: `Popular`, `Latest`, `Top Rated` (passed via the `sort` extra)

## Notes

- This addon provides **catalog and metadata browsing**. It does not serve actual video streams.
- Metadata is translated to **IMDb IDs** (`tt...`) so it works with popular stream addons like **Torrentio**.
- Search uses TMDB's global search and is not filtered by provider, because TMDB's search endpoint does not support `with_watch_providers`.
- Provider availability is based on TMDB's watch-provider data for the `US` region.

## History

- **v2.0.0** — Added 3 sort modes (Popular, Latest, Top Rated), 100 results per catalog, enhanced metadata, genre support, search, trailer links, IMDb links, cast/director/writers info, proper pagination, separate movie/TV genres, error handling, dotenv support, Vercel deployment support, reduced to 18 catalogs to comply with Stremio's 8 KB manifest limit
- **v1.0.0** — Initial version with basic provider catalogs (20 results each)
