const axios = require("axios");
const Movie = require("../models/movie");
const { TMDB_API_URL, TMDB_IMG_PATH } = require("../utils/config");
const { decodeMovieGenres, decodeTvGenres } = require("../utils/genres");
const {
  sendError,
  formatMovies,
  getMoviesByAggregation,
  sortingPipeline,
  importMovie,
} = require("../utils/helper");

exports.getTrendingMovies = async (req, res) => {
  const { type = "all", limit = 10 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/trending/${type}/day?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    return sendError(res, error.message);
  }
  let results = response.data.results;
  results = results.filter((_, index) => index < parseInt(limit));
  res.json(await formatMovies(results));
};

exports.getNowPlaying = async (req, res) => {
  const { type = "movie", limit = 5 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${
        type === "movie" ? "now_playing" : "on_the_air"
      }?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    return sendError(res, error);
  }
  let results = response.data.results;
  results = results.filter((_, index) => index < parseInt(limit));
  res.json(await formatMovies(results, "original"));
};

exports.getSingleMovie = async (req, res) => {
  const { type = "movie" } = req.query;
  const { movieId } = req.params;
  let movie = await Movie.findOne({ tmdb_id: movieId, type });
  if (!movie) {
    const { error, status_message, status } = await importMovie(movieId, type);
    if (error) return sendError(res, status_message, status);
    movie = await Movie.findOne({ tmdb_id: movieId, type });
  }
  res.json({ movie });
};

exports.getSimilarMovies = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie", limit = 5 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${movieId}/similar?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    return sendError(res, error);
  }
  let results = response.data.results;
  results = results.filter((r, index) => index < parseInt(limit));
  res.json(await formatMovies(results));
};

exports.getMoviesByGenres = async (req, res) => {
  const { genreIds } = req.params;
  const { type = "movie" } = req.query;
  const genreMap = type === "movie" ? decodeMovieGenres : decodeTvGenres;
  for (let genreId of genreIds.split(",")) {
    if (!genreMap.has(parseInt(genreId)))
      return sendError(res, "Genre ID not found!", 404);
  }

  const { sort_by = "popularity.desc", page = 1 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/discover/${type}?api_key=${process.env.TMDB_API_KEY}&language=en-US&sort_by=${sort_by}&page=${page}&with_genres=${genreIds}`
    );
  } catch (error) {
    return sendError(res, error);
  }
  const results = response.data.results;
  res.json(await formatMovies(results));
};

exports.getMostRatedMovies = async (req, res) => {
  const { type = "movie", genre = "" } = req.query;
  const mostRatedPipeline = sortingPipeline(
    {
      reviewCount: -1,
      ratingAvg: -1,
    },
    type
  );
  res.json(await getMoviesByAggregation(mostRatedPipeline, type, genre));
};

exports.getTopRatedMovies = async (req, res) => {
  const { type = "movie", genre = "" } = req.query;
  const topRatedPipeline = sortingPipeline(
    {
      ratingAvg: -1,
      reviewCount: -1,
    },
    type
  );
  res.json(await getMoviesByAggregation(topRatedPipeline, type, genre));
};

exports.getLeastRatedMovies = async (req, res) => {
  const { type = "movie", genre = "" } = req.query;
  const leastRatedPipeline = sortingPipeline(
    {
      reviewCount: 1,
      ratingAvg: -1,
    },
    type
  );
  res.json(await getMoviesByAggregation(leastRatedPipeline, type, genre));
};

exports.getBottomRatedMovies = async (req, res) => {
  const { type = "movie", genre = "" } = req.query;
  const btmRatedPipeline = sortingPipeline(
    {
      ratingAvg: 1,
      reviewCount: -1,
    },
    type
  );
  res.json(await getMoviesByAggregation(btmRatedPipeline, type, genre));
};

exports.getSearchResults = async (req, res) => {
  const { type = "movie", text = "" } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/search/${type}?api_key=${process.env.TMDB_API_KEY}&query=${text}&language=en-US`
    );
  } catch (error) {
    const { response } = error;
    const { status_message } = response?.data;
    return sendError(res, status_message, response.status);
  }
  const results = response.data.results;
  res.json(await formatMovies(results));
};

exports.getCredits = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${movieId}/credits?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    return sendError(res, error);
  }
  let { cast, crew } = response.data;
  cast = cast.map((c) => {
    const { id, name, profile_path, character } = c;
    return { id, name, profile: TMDB_IMG_PATH + profile_path, character };
  });
  const directors = [],
    writers = [],
    producers = [],
    sound = [],
    art = [],
    VFX = [],
    editors = [],
    costume = [],
    camera = [],
    lighting = [],
    thanks = [],
    others = [];
  for (let c of crew) {
    const { id, name, department, job } = c;
    const person = { id, name, job };
    if (job === "Thanks" || job === "In Memory Of") {
      thanks.push(person);
    } else if (department === "Directing") {
      directors.push(person);
    } else if (department === "Writing") {
      writers.push(person);
    } else if (department === "Production") {
      producers.push(person);
    } else if (department === "Sound") {
      sound.push(person);
    } else if (department === "Art") {
      art.push(person);
    } else if (department === "Visual Effects") {
      VFX.push(person);
    } else if (department === "Editing") {
      editors.push(person);
    } else if (department === "Costume & Make-Up") {
      costume.push(person);
    } else if (department === "Camera") {
      camera.push(person);
    } else if (department === "Lighting") {
      lighting.push(person);
    } else {
      others.push(person);
    }
  }
  res.json({
    cast,
    directors,
    writers,
    producers,
    sound,
    art,
    VFX,
    editors,
    costume,
    camera,
    lighting,
    thanks,
    others,
  });
};

exports.getVideos = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${movieId}/videos?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    return sendError(res, error);
  }
  const { results } = response.data;
  const videos = results
    .filter((r) => r.site === "YouTube")
    .map((r) => {
      const { name, key, type, published_at } = r;
      return { name, key, type, published_at };
    });
  res.json({ videos });
};

exports.getMovieImages = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${movieId}/images?api_key=${process.env.TMDB_API_KEY}`
    );
  } catch (error) {
    return sendError(res, error);
  }
  let { backdrops, logos, posters } = response.data;
  backdrops = backdrops.map((b) => b.file_path);
  logos = logos.map((l) => l.file_path);
  posters = posters.map((p) => p.file_path);
  res.json({ backdrops, logos, posters });
};
