const { isValidObjectId } = require("mongoose");
const Movie = require("../models/movie");
const Review = require("../models/review");
const User = require("../models/user");
const { sendError, importMovie, formatReviews } = require("../utils/helper");

exports.getReviewByUserAndMovie = async (req, res) => {
  const { movieId } = req.params;
  const { _id: userId, name } = req.user;
  const review = await Review.findOne({ parentMovie: movieId, owner: userId });
  if (!review) return res.json({});
  const { _id: reviewId, content, rating, likes, dislikes } = review;
  res.json({
    id: reviewId,
    owner: {
      id: userId,
      name,
    },
    content,
    rating,
    likes,
    dislikes,
  });
};

exports.addReview = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  const { content, rating } = req.body;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  const { movieWatchList, tvWatchList, watchedMovies, watchedTVs } = user;
  if (type === "movie" && watchedMovies.includes(movieId)) return sendError(res, "Movie is already reviewed!"); 
  if (type === "tv" && watchedTVs.includes(movieId)) return sendError(res, "TV is already reviewed!");
  let movie = await Movie.findOne({ tmdb_id: movieId, type });
  if (!movie) {
    const { error, status_message, status } = await importMovie(movieId, type);
    if (error) return sendError(res, status_message, status);
    movie = await Movie.findOne({ tmdb_id: movieId, type });
  }

  const newReview = new Review({
    owner: userId,
    parentMovie: movieId,
    content,
    rating,
  });

  // updating review for movie
  movie.reviews?.push(newReview._id);
  movie.ratingSum += rating;
  await movie.save();

  // updating reviews for the user
  if (type === "movie") {
    watchedMovies?.push(movieId);
    user.movieWatchList = movieWatchList.filter((w) => w !== movieId);
  } else {
    watchedTVs?.push(movieId);
    user.tvWatchList = tvWatchList.filter((w) => w !== movieId);
  }

  // saving review
  await newReview.save();
  await user.save();

  // finding reviews related to the movie
  const { error, reviews } = await formatReviews(movieId);
  if (error) return sendError(res, error, 404);

  const singleReview = {
    id: newReview._id,
    owner: {
      id: userId,
      name: user.name,
    },
    content,
    rating,
  };

  res.json({
    message: "Your review has been added.",
    ratingSum: movie.ratingSum,
    reviews,
    singleReview,
  });
};

exports.updateReview = async (req, res) => {
  const { reviewId } = req.params;
  if (!isValidObjectId(reviewId)) return sendError(res, "Invalid review ID!");
  const { content, rating } = req.body;
  const { _id: userId, name } = req.user;
  const review = await Review.findOne({ _id: reviewId, owner: userId });
  if (!review) return sendError(res, "Review not found!", 404);

  // saving movie
  const movie = await Movie.findOne({ tmdb_id: review.parentMovie });
  if (!movie) return sendError(res, "Movie not found!", 404);
  movie.ratingSum += rating - review.rating;
  await movie.save();

  // saving review
  review.content = content;
  review.rating = rating;
  await review.save();

  // finding reviews related to the movie
  const { error, reviews } = await formatReviews(review.parentMovie);
  if (error) return sendError(res, error, 404);

  const singleReview = {
    id: review._id,
    owner: {
      id: userId,
      name,
    },
    content,
    rating,
  };

  res.json({
    message: "Your review has been updated.",
    ratingSum: movie.ratingSum,
    reviews,
    singleReview,
  });
};

exports.removeReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  if (!isValidObjectId(reviewId)) return sendError(res, "Invalid review ID!");
  const review = await Review.findOne({ _id: reviewId, owner: userId });
  if (!review) return sendError(res, "Review not found!", 404);
  // removing review from movie
  const movie = await Movie.findOne({ tmdb_id: review.parentMovie });
  movie.reviews = movie.reviews.filter((rId) => rId.toString() !== reviewId);
  movie.ratingSum -= review.rating;
  await movie.save();

  // removing review from user
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  if (movie.type === "movie")
    user.watchedMovies = user.watchedMovies?.filter(
      (w) => w != review.parentMovie
    );
  else
    user.watchedTVs = user.watchedTVs?.filter((w) => w != review.parentMovie);
  await user.save();

  // deleting review
  await Review.findByIdAndDelete(reviewId);
  res.json({ message: "Your review has been removed." });
};

exports.getReviewsByMovie = async (req, res) => {
  const { movieId } = req.params;
  const { error, reviews } = await formatReviews(movieId);
  if (error) return sendError(res, error, 404);
  res.json({ reviews });
};

exports.addTag = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  const { tag } = req.body;
  let movie = await Movie.findOne({ tmdb_id: movieId, type });
  if (!movie) movie = new Movie({ tmdb_id: movieId, type });
  // adding tag for movie
  if (movie?.tags.includes(tag))
    return sendError(res, "This tag already exists!");
  movie.tags.push(tag);
  await movie.save();
  res.json({ message: "Your tag has been added." });
};

exports.likeReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  const review = await Review.findOne({ _id: reviewId });
  if (!review) return sendError(res, "Review not found!", 404);
  if (review.likes?.includes(userId))
    return sendError(res, "You already liked this review!");
  review.likes?.push(userId);
  await review.save();
  res.json({ message: "You have liked this review." });
};

exports.dislikeReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  const review = await Review.findOne({ _id: reviewId, owner: userId });
  if (!review) return sendError(res, "Review not found!", 404);
  if (review.dislikes?.includes(userId))
    return sendError(res, "You already disliked this review!");
  review.dislikes?.push(userId);
  await review.save();
  res.json({ message: "You have disliked this review." });
};
