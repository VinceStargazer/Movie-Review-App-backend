const axios = require("axios");
const { isValidObjectId } = require("mongoose");
const { uploadAvatar, removeFromCloud } = require("../cloud/helper");
const Actor = require("../models/actor");
const {
  sendError,
  formatActor,
  formatPersons,
  getMovieReview,
} = require("../utils/helper");
const { TMDB_API_URL } = require("../utils/config");

exports.create = async (req, res) => {
  const { name, about, gender, birthday } = req.body;
  const { file } = req;

  const actor = new Actor({ name, about, gender, birthday });
  if (file) actor.avatar = await uploadAvatar(file);
  await actor.save();

  res.status(201).json({ actor: formatActor(actor) });
};

exports.update = async (req, res) => {
  const { name, about, gender, birthday } = req.body;
  const { file } = req;
  const { actorId } = req.params;
  if (!isValidObjectId(actorId)) return sendError(res, "Invalid ID!");
  const actor = await Actor.findById(actorId);
  if (!actor) return sendError(res, "Actor not found!", 404);

  // remove an existing old avatar if a new avatar is given
  const public_id = actor.avatar?.public_id;
  if (public_id && file) {
    const { error } = await removeFromCloud(public_id);
    if (error) return sendError(res, error);
  }

  // update the avatar if there is one
  if (file) actor.avatar = await uploadAvatar(file);

  // update other actor info
  actor.name = name;
  actor.about = about;
  actor.gender = gender;
  actor.birthday = birthday;
  await actor.save();
  res.status(201).json(formatActor(actor));
};

exports.remove = async (req, res) => {
  const { actorId } = req.params;
  if (!isValidObjectId(actorId)) return sendError(res, "Invalid ID!");
  const actor = await Actor.findById(actorId);
  if (!actor) return sendError(res, "Actor not found!", 404);

  // remove an existing avatar if there is one
  const public_id = actor.avatar?.public_id;
  if (public_id) {
    const { error } = await removeFromCloud(public_id);
    if (error) return sendError(res, error);
  }

  await Actor.findByIdAndDelete(actorId);
  res.json({ message: "Actor removed successfully." });
};

exports.search = async (req, res) => {
  const { query = "", limit = 100 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/search/person?api_key=${process.env.TMDB_API_KEY}&language=en-US&query=${query}`
    );
  } catch (error) {
    return sendError(res, error);
  }
  let results = response.data.results;
  results = results
    .filter((_, index) => index < limit)
    .map((r) => {
      const { profile_path, id, name, known_for } = r;
      return {
        id,
        name,
        profile_path,
        known_for: known_for.length ? `${known_for[0].title} (${known_for[0].release_date?.substring(0, 4)})` : ''
      };
    });
  res.json({ results });
};

exports.getLatest = async (req, res) => {
  // get 12 most recent uploads
  const result = await Actor.find().sort({ createdAt: "-1" }).limit(12);
  const actors = result.map((actor) => formatActor(actor));
  res.json(actors);
};

exports.getSingle = async (req, res) => {
  const { actorId } = req.params;
  if (!isValidObjectId(actorId)) return sendError(res, "Invalid ID!");
  const actor = await Actor.findById(actorId);
  if (!actor) return sendError(res, "Actor not found!", 404);
  res.json(formatActor(actor));
};

exports.getPopular = async (req, res) => {
  const { limit = 5 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/person/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
    );
  } catch (error) {
    return sendError(res, error);
  }
  let results = response.data.results;
  results = results.filter((r, index) => index < parseInt(limit));
  res.json(formatPersons(results));
};

exports.getPerson = async (req, res) => {
  const { personId } = req.params;
  const { limit = 6 } = req.query;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/person/${personId}?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
    );
  } catch (error) {
    return sendError(res, error);
  }

  const {
    id,
    name,
    gender,
    birthday,
    deathday,
    biography,
    known_for_department,
    place_of_birth,
    profile_path,
  } = response.data;

  try {
    response = await axios.get(
      `${TMDB_API_URL}/person/${personId}/combined_credits?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
    );
  } catch (error) {
    return sendError(res, error);
  }

  const { cast, crew } = response.data;
  let credits = known_for_department === "Acting" ? cast : crew;
  credits = credits.sort((a, b) => b.vote_count - a.vote_count);
  const set = new Set();
  const known_for = [];
  for (let c of credits) {
    if (set.has(c.id)) continue;
    const {
      id,
      title,
      name,
      media_type,
      poster_path,
      release_date,
      first_air_date,
      character,
      job,
    } = c;
    set.add(id);
    const reviews = await getMovieReview(id, media_type);
    known_for.push({
      id,
      type: media_type,
      title: title || name,
      poster: poster_path,
      releaseDate: release_date || first_air_date,
      character: character || job,
      reviews,
    });
    if (known_for.length === limit) break;
  }

  const person = {
    id,
    name,
    gender,
    birthday,
    deathday,
    biography,
    known_for_department,
    place_of_birth,
    profile_path,
    known_for,
  };

  res.json({ person });
};

exports.getPersonImages = async (req, res) => {
  const { personId } = req.params;
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/person/${personId}/images?api_key=${process.env.TMDB_API_KEY}`
    );
  } catch (error) {
    return sendError(res, error);
  }
  const { profiles } = response.data;
  const images = profiles.map((p) => p.file_path);
  res.json({ images });
};
