const mongoose = require("mongoose");

const movieSchema = mongoose.Schema(
  {
    tmdb_id: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
    },
    storyline: {
      type: String,
    },
    runtime: {
      type: Number,
    },
    type: {
      type: String,
    },
    languages: {
      type: [String],
    },
    genres: {
      type: [String],
    },
    backdrop: {
      type: String,
    },
    poster: {
      type: String,
    },
    tags: {
      type: [String],
    },
    releaseDate: {
      type: Date,
    },
    directors: {
      type: [Object],
    },
    cast: {
      type: [Object],
    },
    writers: {
      type: [Object],
    },
    trailer: {
      type: String,
    },
    homepage: {
      type: String,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    ratingSum: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
