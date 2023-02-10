const express = require("express");
const {
  getTrendingMovies,
  getSingleMovie,
  getSimilarMovies,
  getMoviesByGenres,
  getMostRatedMovies,
  getTopRatedMovies,
  getLeastRatedMovies,
  getBottomRatedMovies,
  getNowPlaying,
  getCredits,
  getVideos,
  getMovieImages,
  getMovieSearch
} = require("../controllers/movie");
const router = express.Router();

router.get("/trending", getTrendingMovies);
router.get("/search", getMovieSearch);
router.get("/now-playing", getNowPlaying);
router.get("/:movieId", getSingleMovie);
router.get("/:movieId/similar", getSimilarMovies);
router.get("/genre/:genreIds", getMoviesByGenres);
router.get("/most-rated", getMostRatedMovies);
router.get("/top-rated", getTopRatedMovies);
router.get("/least-rated", getLeastRatedMovies);
router.get("/bottom-rated", getBottomRatedMovies);
router.get("/:movieId/credits", getCredits);
router.get("/:movieId/videos", getVideos);
router.get("/:movieId/images", getMovieImages);

module.exports = router;
