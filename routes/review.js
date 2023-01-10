const {
  addReview,
  updateReview,
  removeReview,
  getReviewsByMovie,
  addTag,
  getReviewByUserAndMovie,
  likeReview,
  dislikeReview,
} = require("../controllers/review");
const { isAuth } = require("../middlewares/auth");
const { reviewValidator, validate } = require("../middlewares/validator");

const router = require("express").Router();

router.get("/get-review-by-user-and-movie/:movieId", isAuth, getReviewByUserAndMovie);
router.post("/add/:movieId", isAuth, reviewValidator, validate, addReview);
router.patch("/:reviewId", isAuth, reviewValidator, validate, updateReview);
router.delete("/:reviewId", isAuth, removeReview);
router.get("/get-reviews-by-movie/:movieId", getReviewsByMovie);
router.post("/tag/:movieId", isAuth, addTag);
router.patch("/like/:reviewId", isAuth, likeReview);
router.patch("/dislike/:reviewId", isAuth, dislikeReview);

module.exports = router;
