const mongoose = require("mongoose");

const reviewSchema = mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentMovie: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    likes: {
      type: [String],
      default: [],
    },
    dislikes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
