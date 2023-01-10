const express = require("express");
const {
  create,
  verifyEmail,
  reVerifyEmail,
  forgetPasswd,
  passwdResetStatus,
  resetPasswd,
  signIn,
  getWatchlist,
  getWatched,
  bookmark,
  unbookmark,
} = require("../controllers/user");
const { isAuth } = require("../middlewares/auth");
const { isValidPassResetToken } = require("../middlewares/user");
const {
  userValidator,
  validate,
  validatePasswd,
  signInValidator,
} = require("../middlewares/validator");

const router = express.Router();

router.post("/create", userValidator, validate, create);
router.post("/sign-in", signInValidator, validate, signIn);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", reVerifyEmail);
router.post("/forget-password", forgetPasswd);
router.post(
  "/verify-pass-reset-token",
  isValidPassResetToken,
  passwdResetStatus
);
router.post("/reset-password", validatePasswd, validate, resetPasswd);

router.get("/is-auth", isAuth, (req, res) => {
  const { user } = req;
  if (!user) return sendError(res, "Invalid token!");
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role
    },
  });
});

router.get("/watchlist", isAuth, getWatchlist);
router.get("/watched", isAuth, getWatched);
router.post("/bookmark/:movieId", isAuth, bookmark);
router.post("/unbookmark/:movieId", isAuth, unbookmark);

module.exports = router;
