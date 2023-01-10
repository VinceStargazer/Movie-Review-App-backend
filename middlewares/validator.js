const { check, validationResult } = require("express-validator");
const { isValidObjectId } = require("mongoose");
const genres = require("../utils/genres");
const { sendError } = require("../utils/helper");

exports.userValidator = [
  check("name").trim().not().isEmpty().withMessage("Name is missing!"),
  check("email").normalizeEmail().isEmail().withMessage("Invalid email!"),
  check("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Password is missing!")
    .isLength({ min: 8, max: 20 })
    .withMessage("Password must be 8 to 20 characters long!"),
];

exports.validatePasswd = [
  check("newPasswd")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Password is missing!")
    .isLength({ min: 8, max: 20 })
    .withMessage("Password must be 8 to 20 characters long!"),
];

exports.signInValidator = [
  check("email").normalizeEmail().isEmail().withMessage("Invalid email!"),
  check("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Password is missing!")
    .isLength({ min: 8, max: 20 })
    .withMessage("Password must be 8 to 20 characters long!"),
];

exports.actorValidator = [
  check("name").trim().not().isEmpty().withMessage("Name is missing!"),
  check("about")
    .trim()
    .not()
    .isEmpty()
    .withMessage("About is a required field!"),
  check("gender")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Gender is a required field!"),
];

exports.movieValidator = [
  check("title").trim().not().isEmpty().withMessage("Title is missing!"),
  check("storyline")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Storyline is a required field!"),
  check("releaseDate").isDate().withMessage("Invalid release date!"),
  check("language").trim().not().isEmpty().withMessage("Language is missing!"),
  check("status")
    .isIn(["public", "private"])
    .withMessage("Status must be either public or private!"),
  check("type").trim().not().isEmpty().withMessage("Movie type is missing!"),
  check("genres")
    .isArray()
    .withMessage("Genres must be an array of strings!")
    .custom((value) => {
      for (let g of value) {
        if (!genres.includes(g)) throw Error("Invalid genres!");
      }
      return true;
    }),
  check("tags")
    .isArray({ min: 1 })
    .withMessage("Tags must be an array of strings!")
    .custom((tags) => {
      for (let t of tags) {
        if (typeof t !== "string")
          throw Error("Tags must be an array of strings!");
      }
      return true;
    }),
  check("length")
    .isInt({ min: 1 })
    .withMessage("Length must be a positive integer!"),
  check("cast")
    .isArray()
    .withMessage("Cast must be an array of objects!")
    .custom((cast) => {
      for (let c of cast) {
        const { actor, roleAs, leadActor } = c;
        if (!actor || !isValidObjectId(actor))
          throw Error("Invalid person ID inside cast!");
        if (!roleAs || !roleAs.trim())
          throw Error("RoleAs is missing inside cast!");
        if (typeof leadActor !== "boolean")
          throw Error("Lead actor must be a boolean value!");
      }
      return true;
    }),
  check("trailer")
    .isObject()
    .withMessage("Trailer info must be an object with URL and public ID!")
    .custom((trailer) => {
      const { url, public_id } = trailer;
      try {
        const result = new URL(url);
        if (!result.protocol.includes("http"))
          throw Error("Invalid trailer URL!");
        const arr = url.split("/");
        if (arr[arr.length - 1].split(".")[0] !== public_id)
          throw Error("Invalid trailer URL!");
      } catch (error) {
        throw Error("Invalid trailer URL!");
      }
      return true;
    }),
];

exports.reviewValidator = [
  check("rating", "Rating must be a number between 1 and 10!").isInt({
    min: 1,
    max: 10,
  }),
];

exports.validate = (req, res, next) => {
  const error = validationResult(req).array();
  if (error.length) {
    return sendError(res, error[0].msg);
  }
  next();
};
