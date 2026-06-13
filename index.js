require("dotenv").config()
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk")
const fetch = require("node-fetch")

const TMDB_API_KEY = process.env.TMDB_API_KEY
const PORT = process.env.PORT || 7000

if (!TMDB_API_KEY) {
  console.error("ERROR: TMDB_API_KEY environment variable is not set.")
  console.error("Get a free API key at: https://www.themoviedb.org/settings/api")
  process.exit(1)
}

const TMDB_BASE = "https://api.themoviedb.org/3"
const IMG_BASE = "https://image.tmdb.org/t/p"

const REGION = "US"

const PROVIDERS = {
  netflix:   { id: 8,    name: "Netflix" },
  prime:     { id: 9,    name: "Prime Video" },
  disney:    { id: 337,  name: "Disney+" },
  hulu:      { id: 15,   name: "Hulu" },
  max:       { id: 1899, name: "Max" },
  apple:     { id: 350,  name: "Apple TV+" },
  paramount: { id: 531,  name: "Paramount+" },
  peacock:   { id: 386,  name: "Peacock" },
  discovery: { id: 1888, name: "Discovery+" },
}

const SORTS = {
  popular: { tmdb: "popularity.desc",             label: "Popular" },
  latest:  { tmdb: "primary_release_date.desc",   label: "Latest" },
  top:     { tmdb: "vote_average.desc",           label: "Top Rated" },
}

const SERIES_SORTS = {
  popular: { tmdb: "popularity.desc",      label: "Popular" },
  latest:  { tmdb: "first_air_date.desc",  label: "Latest" },
  top:     { tmdb: "vote_average.desc",    label: "Top Rated" },
}

const MOVIE_GENRES = [
  { id: 28,    name: "Action" },
  { id: 12,    name: "Adventure" },
  { id: 16,    name: "Animation" },
  { id: 35,    name: "Comedy" },
  { id: 80,    name: "Crime" },
  { id: 18,    name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14,    name: "Fantasy" },
  { id: 27,    name: "Horror" },
  { id: 9648,  name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878,   name: "Sci-Fi" },
  { id: 53,    name: "Thriller" },
]

const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16,    name: "Animation" },
  { id: 35,    name: "Comedy" },
  { id: 80,    name: "Crime" },
  { id: 18,    name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648,  name: "Mystery" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
]

const GENRE_NAMES = {
  movie:  Object.fromEntries(MOVIE_GENRES.map(g => [g.name.toLowerCase(), g.id])),
  series: Object.fromEntries(TV_GENRES.map(g => [g.name.toLowerCase(), g.id])),
}

const ALL_GENRE_BY_ID = Object.fromEntries([
  ...MOVIE_GENRES.map(g => [g.id, g.name]),
  ...TV_GENRES.map(g => [g.id, g.name]),
])

function buildCatalogs() {
  const catalogs = []
  for (const [key, p] of Object.entries(PROVIDERS)) {
    catalogs.push({
      type: "movie",
      id: `${key}_movie`,
      name: `${p.name} Movies`,
      extra: [
        { name: "search" },
        { name: "genre", options: MOVIE_GENRES.map(g => g.name) },
        { name: "sort",  options: Object.values(SORTS).map(s => s.label) },
        { name: "skip" },
      ],
    })
    catalogs.push({
      type: "series",
      id: `${key}_series`,
      name: `${p.name} Series`,
      extra: [
        { name: "search" },
        { name: "genre", options: TV_GENRES.map(g => g.name) },
        { name: "sort",  options: Object.values(SERIES_SORTS).map(s => s.label) },
        { name: "skip" },
      ],
    })
  }
  return catalogs
}

async function tmdb(endpoint, params = {}) {
  const qs = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: "en-US",
    ...params,
  }).toString()
  const res = await fetch(`${TMDB_BASE}${endpoint}?${qs}`)
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`TMDB ${res.status}: ${endpoint} - ${body}`)
  }
  return res.json()
}

function toMetaBody(item, type) {
  const isSeries = type === "series" || item.media_type === "tv" || item.first_air_date
  const title = isSeries ? item.name : item.title
  const year = isSeries
    ? (item.first_air_date || "").slice(0, 4)
    : (item.release_date || "").slice(0, 4)
  const poster = item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : undefined
  const background = item.backdrop_path ? `${IMG_BASE}/w1280${item.backdrop_path}` : undefined

  const genreIds = item.genre_ids || []
  const genreObjects = item.genres || []
  const genres = genreObjects.length
    ? genreObjects.map(g => g.name)
    : genreIds.map(id => ALL_GENRE_BY_ID[id]).filter(Boolean)

  return {
    id: `${isSeries ? "tv" : "movie"}:${item.id}`,
    type: isSeries ? "series" : "movie",
    name: title,
    year: year ? Number(year) : undefined,
    poster,
    background,
    posterShape: "regular",
    description: item.overview,
    releaseInfo: isSeries ? (item.first_air_date || "") : (item.release_date || ""),
    imdbRating: item.vote_average ? String(Math.round(item.vote_average * 10) / 10) : undefined,
    genres: genres.length ? genres : undefined,
  }
}

function sortLabelToKey(label, type) {
  const map = type === "series" ? SERIES_SORTS : SORTS
  for (const [key, val] of Object.entries(map)) {
    if (val.label === label) return key
  }
  return "popular"
}

function parseCatalogId(id) {
  const parts = id.split("_")
  return {
    key: parts[0],
    mediaType: parts[1],
  }
}

const builder = addonBuilder({
  id: "com.stremio.streaming-catalog",
  version: "2.0.0",
  name: "Streaming Catalog",
  description: "Browse movies & series on Netflix, Prime, Disney+, Hulu, Max, Apple TV+, Paramount+, Peacock, Discovery+ — by genre, popularity, latest, or top rated",
  resources: ["catalog", "meta", "stream"],
  types: ["movie", "series"],
  idPrefixes: ["movie:", "tv:"],
  catalogs: buildCatalogs(),
})

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  try {
    const { key, mediaType } = parseCatalogId(id)
    const provider = PROVIDERS[key]
    if (!provider || mediaType !== type) return { metas: [] }

    const tmdbType = mediaType === "series" ? "tv" : "movie"
    const sortKey = sortLabelToKey(extra.sort, mediaType)
    const sortMap = tmdbType === "tv" ? SERIES_SORTS : SORTS
    const sortBy = sortMap[sortKey]?.tmdb || "popularity.desc"

    const skip = parseInt(extra.skip || "0", 10) || 0
    const pageSize = 100
    const tmdbPageSize = 20
    const startPage = Math.floor(skip / tmdbPageSize) + 1
    const pagesNeeded = Math.ceil(pageSize / tmdbPageSize)

    const genreMap = GENRE_NAMES[mediaType] || {}
    const genreId = extra.genre ? genreMap[extra.genre.toLowerCase()] : undefined

    if (extra.search) {
      const searchData = await tmdb(`/search/${tmdbType}`, {
        query: extra.search,
        page: startPage,
      })
      const metas = (searchData.results || []).map(item => toMetaBody(item, tmdbType))
      return { metas }
    }

    const params = {
      with_watch_providers: provider.id,
      watch_region: REGION,
      sort_by: sortBy,
    }
    if (genreId) params.with_genres = genreId

    const allResults = []
    for (let p = startPage; p < startPage + pagesNeeded && p <= 25; p++) {
      const data = await tmdb(`/discover/${tmdbType}`, { ...params, page: p })
      allResults.push(...(data.results || []))
      if (data.results.length < tmdbPageSize) break
    }

    const metas = allResults.map(item => toMetaBody(item, tmdbType))
    return { metas }
  } catch (err) {
    console.error("Catalog handler error:", err.message)
    return { metas: [] }
  }
})

builder.defineMetaHandler(async ({ type, id }) => {
  try {
    const [, tmdbId] = id.split(":")
    const tmdbType = type === "series" ? "tv" : "movie"

    const data = await tmdb(`/${tmdbType}/${tmdbId}`, {
      append_to_response: "credits,watch/providers,external_ids,videos",
    })

    const meta = toMetaBody(data, tmdbType)
    if (data.external_ids?.imdb_id) {
      meta.id = data.external_ids.imdb_id
    }
    meta.cast = data.credits?.cast?.slice(0, 15).map(c => ({
      name: c.name,
      role: c.character,
      image: c.profile_path ? `${IMG_BASE}/w185${c.profile_path}` : undefined,
    }))
    meta.director = data.credits?.crew?.filter(c => c.job === "Director").map(c => c.name)
    meta.writers = data.credits?.crew?.filter(c => c.department === "Writing").map(c => c.name)
    meta.genres = data.genres?.map(g => g.name)
    meta.releaseInfo = tmdbType === "tv" ? data.first_air_date : data.release_date
    meta.runtime = tmdbType === "tv"
      ? `${data.episode_run_time?.[0] || ""} min/ep`
      : `${data.runtime || ""} min`
    meta.country = data.production_countries?.map(c => c.name) || data.origin_country
    meta.language = data.original_language
    meta.status = data.status
    meta.totalEpisodes = data.number_of_episodes
    meta.totalSeasons = data.number_of_seasons

    if (data.videos?.results?.length) {
      const trailer = data.videos.results.find(v => v.type === "Trailer" && v.site === "YouTube")
      if (trailer) {
        meta.trailerStreams = [{
          title: "Trailer",
          ytId: trailer.key,
        }]
      }
    }

    const watch = data["watch/providers"]?.results?.[REGION]
    if (watch?.flatrate) {
      meta.streamingServices = watch.flatrate.map(s => ({
        name: s.provider_name,
        logo: `${IMG_BASE}/w92${s.logo_path}`,
        url: `https://www.themoviedb.org/${tmdbType}/${tmdbId}/watch`,
      }))
    }

    meta.links = [
      {
        name: "TMDB",
        category: "External",
        url: `https://www.themoviedb.org/${tmdbType}/${tmdbId}`,
      },
    ]

    if (data.external_ids?.imdb_id) {
      meta.links.push({
        name: "IMDb",
        category: "External",
        url: `https://www.imdb.com/title/${data.external_ids.imdb_id}`,
      })
    }

    return { meta }
  } catch (err) {
    console.error("Meta handler error:", err.message)
    return { meta: null }
  }
})

builder.defineStreamHandler(async ({ type, id }) => {
  try {
    const [, tmdbId] = id.split(":")
    const tmdbType = type === "series" ? "tv" : "movie"

    const data = await tmdb(`/${tmdbType}/${tmdbId}/watch/providers`)
    const watch = data.results?.[REGION]

    if (!watch?.flatrate) return { streams: [] }

    const streams = watch.flatrate.map(s => ({
      name: s.provider_name,
      title: `${s.provider_name} (Streaming)`,
      externalUrl: `https://www.themoviedb.org/${tmdbType}/${tmdbId}/watch`,
    }))

    return { streams }
  } catch (err) {
    console.error("Stream handler error:", err.message)
    return { streams: [] }
  }
})

serveHTTP(builder.getInterface(), { port: PORT })
console.log(`Addon running at http://localhost:${PORT}/manifest.json`)
