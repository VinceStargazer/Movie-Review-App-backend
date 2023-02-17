const jwt = require("jsonwebtoken");
const User = require("../models/user");
const EmailVerificationToken = require("../models/emailVerificationToken");
const PasswdResetToken = require("../models/passwdResetToken");
const { isValidObjectId } = require("mongoose");
const { generateOTP, sendEmail } = require("../utils/mail");
const { formatMovie, sendError, importMovie } = require("../utils/helper");
const Movie = require("../models/movie");
const Review = require("../models/review");

exports.create = async (req, res) => {
  const { name, email, password } = req.body;
  const oldUser = await User.findOne({ email });
  if (oldUser) return sendError(res, "Email already in use!");
  const newUser = new User({ name, email, password });
  await newUser.save();

  // store OTP inside our DB
  let OTP = generateOTP();
  const newToken = new EmailVerificationToken({
    owner: newUser._id,
    token: OTP,
  });
  await newToken.save();

  const htmlContent = `
    <p>Your verification OTP:</p>
    <h1>${OTP}</h1>
  `;

  await sendEmail("Email Verification", htmlContent, email, name);

  res.status(201).json({
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    },
  });
};

exports.verifyEmail = async (req, res) => {
  const { userId, OTP } = req.body;
  if (!isValidObjectId(userId)) return sendError(res, "Invalid user!");
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  if (user.isVerified) return sendError(res, "User already verified!");

  const token = await EmailVerificationToken.findOne({ owner: userId });
  if (!token) return sendError(res, "Token not found!");
  const isMatched = await token.compareToken(OTP);
  if (!isMatched) return sendError(res, "OTP does not match!");

  user.isVerified = true;
  const { _id, name, email, isVerified, role } = user;
  await user.save();
  await EmailVerificationToken.findByIdAndDelete(token._id);

  const htmlContent = "<h1>Welcome to our app and thanks for choosing us!</h1>";
  await sendEmail("Welcome", htmlContent, email, name);

  const jwtToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET);
  res.json({
    user: { id: _id, name, email, token: jwtToken, isVerified, role },
    message: "Your email is verified.",
  });
};

exports.reVerifyEmail = async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  if (user.isVerified) return sendError(res, "User already verified!");

  const oldToken = await EmailVerificationToken.findOne({ owner: userId });
  if (oldToken)
    return sendError(res, "You can request another token only after one hour.");

  // store OTP inside our DB
  let OTP = generateOTP();
  const newToken = new EmailVerificationToken({ owner: user._id, token: OTP });
  await newToken.save();

  const { email, name } = user;

  const htmlContent = `
    <p>Your verification OTP:</p>
    <h1>${OTP}</h1>
  `;
  await sendEmail("Email Verification", htmlContent, email, name);

  res.status(201).json({
    message: "New OTP has been sent to your email. Please verify again.",
  });
};

exports.forgetPasswd = async (req, res) => {
  const { email } = req.body;
  if (!email) return sendError(res, "Email is missing!");
  const user = await User.findOne({ email });
  if (!user) return sendError(res, "User not found!", 404);
  const { _id, name } = user;
  const oldToken = await PasswdResetToken.findOne({ owner: _id });
  if (oldToken)
    return sendError(res, "You can request another token only after one hour.");
  const token = await getRandomBytes();

  // store token inside our DB
  const newToken = await PasswdResetToken({ owner: _id, token });
  await newToken.save();

  // send token to the current user
  const resetPasswdUrl = `https://moviereviewapp.com/auth/reset-password?token=${token}&id=${_id}`;

  const htmlContent = `
    <p>Click here to reset your password</p>
    <a href='${resetPasswdUrl}'>Change Password</a>
  `;
  await sendEmail("Reset Password Link", htmlContent, email, name);

  res.status(201).json({
    message: "Password reset link has been sent to your email.",
  });
};

exports.passwdResetStatus = (req, res) => {
  res.json({ valid: true });
};

exports.resetPasswd = async (req, res) => {
  const { newPasswd, userId } = req.body;
  const user = await User.findById(userId);
  const isMatched = await user.comparePasswd(newPasswd);
  if (isMatched)
    return sendError(
      res,
      "The new password must be different from the old one."
    );

  // reset success
  user.password = newPasswd;
  await user.save();
  await PasswdResetToken.findOneAndDelete({ owner: userId });

  const { email, name } = user;

  const htmlContent = `
      <h1>Password Reset Success</h1>
      <p>Now you can use the new password.</p>
    `;
  await sendEmail("Password Reset Success", htmlContent, email, name);

  res.json({ message: "Your password is reset." });
};

exports.signIn = async (req, res) => {
  // validate user info
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return sendError(res, "Email/Password mismatch!");
  const isMatched = await user.comparePasswd(password);
  if (!isMatched) return sendError(res, "Email/Password mismatch!");

  const { _id, name, role, isVerified } = user;
  const jwtToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET);
  res.json({
    user: { id: _id, name, email, role, token: jwtToken, isVerified },
  });
};

exports.bookmark = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  const movie = await Movie.findOne({ tmdb_id: movieId, type });
  if (!movie) {
    const { error } = await importMovie(movieId, type);
    if (error) return sendError(res, error.message);
  }

  if (type === "movie") {
    const { watchedMovies, movieWatchList } = user;
    if (watchedMovies?.includes(movieId))
      return sendError(res, "Movie is already reviewed!");
    if (movieWatchList?.includes(movieId))
      return sendError(res, "Movie is already in your watchlist!");
    movieWatchList?.push(movieId);
  } else {
    const { watchedTVs, tvWatchList } = user;
    if (watchedTVs?.includes(movieId))
      return sendError(res, "TV is already reviewed!");
    if (tvWatchList?.includes(movieId))
      return sendError(res, "TV is already in your watchlist!");
    tvWatchList?.push(movieId);
  }
  await user.save();
  res.json({
    message: (type === "movie" ? "Movie" : "TV") + " is now bookmarked.",
  });
};

exports.unbookmark = async (req, res) => {
  const { movieId } = req.params;
  const { type = "movie" } = req.query;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  if (type === "movie") {
    const { movieWatchList } = user;
    if (!movieWatchList?.includes(movieId))
      return sendError(res, "Movie is not in your watchlist!");
    user.movieWatchList = movieWatchList.filter((m) => m !== movieId);
  } else {
    const { tvWatchList } = user;
    if (!tvWatchList?.includes(movieId))
      return sendError(res, "TV is not in your watchlist!");
    user.tvWatchList = tvWatchList.filter((m) => m !== movieId);
  }
  await user.save();
  res.json({
    message: (type === "movie" ? "Movie" : "TV") + " is no longer bookmarked.",
  });
};

exports.getSimpleWatchlist = async (req, res) => {
  const { type = "movie" } = req.query;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  const watchlist = type === "movie" ? user.movieWatchList : user.tvWatchList;
  res.json({ watchlist });
};

exports.getSimpleWatched = async (req, res) => {
  const { type = "movie" } = req.query;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  const watched = type === "movie" ? user.watchedMovies : user.watchedTVs;
  res.json({ watched });
};

exports.getWatchlist = async (req, res) => {
  const { type = "movie" } = req.query;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  let watchlist = type === "movie" ? user.movieWatchList : user.tvWatchList;
  watchlist = await Promise.all(
    watchlist.map(async (w) => {
      const movie = await Movie.findOne({ tmdb_id: w, type });
      if (!movie) return sendError(res, "Movie ID not found!", 404);
      return formatMovie(movie);
    })
  );
  res.json({ watchlist });
};

exports.getWatched = async (req, res) => {
  const { type = "movie" } = req.query;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);
  let watched = type === "movie" ? user.watchedMovies : user.watchedTVs;
  watched = await Promise.all(
    watched.map(async (w) => {
      const movie = await Movie.findOne({ tmdb_id: w, type });
      if (!movie) return sendError(res, "Movie not found!", 404);
      const ret = formatMovie(movie);
      const myReview = await Review.findOne({ owner: userId, parentMovie: w });
      if (!myReview) return sendError(res, "Review not found!", 404);
      return { ...ret, myReview };
    })
  );
  res.json({ watched });
};
