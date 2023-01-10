const crypto = require("crypto");
const axios = require("axios");
const Movie = require("../models/movie");
const {
  TMDB_IMG_PATH,
  TMDB_API_URL,
  TMDB_IMG_ORIGIN,
  YOUTUBE_PATH,
} = require("./config");

exports.sendError = (res, error, statusCode = 401) => {
  return res.status(statusCode).json({ error });
};

exports.getRandomBytes = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(30, (err, buff) => {
      if (err) reject(err);
      const buffString = buff.toString("hex");
      console.log(buffString);
      resolve(buffString);
    });
  });
};

exports.handleNotFound = (req, res) => {
  this.sendError(res, "Not found", 404);
};

exports.formatActor = (actor) => {
  const { _id, name, about, gender, birthday, avatar } = actor;
  return {
    id: _id,
    name,
    about,
    gender,
    birthday,
    avatar: avatar?.url,
  };
};

exports.parseData = (req, res, next) => {
  const { trailer, cast, genres, tags, writers } = req.body;
  if (trailer) req.body.trailer = JSON.parse(trailer);
  if (cast) req.body.cast = JSON.parse(cast);
  if (genres) req.body.genres = JSON.parse(genres);
  if (tags) req.body.tags = JSON.parse(tags);
  if (writers) req.body.writers = JSON.parse(writers);
  next();
};

exports.getMovieReview = async (movieId) => {
  const movie = await Movie.findOne({ tmdb_id: movieId });
  if (!movie) return { ratingSum: 0, reviewCount: 0 };
  return {
    ratingSum: movie.ratingSum,
    reviewCount: movie.reviews.length,
  };
};

exports.getTrailer = async (movieId, type) => {
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${movieId}/videos?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    return { error };
  }
  let results = response.data.results;
  if (!results.length) return null;
  for (let video of results)
    if (video.site === "YouTube" && video.name?.includes("Trailer"))
      return video.key;
  return null;
};

exports.formatMovies = async (movies, quality = "") => {
  const imagePath = quality === "original" ? TMDB_IMG_ORIGIN : TMDB_IMG_PATH;
  const results = await Promise.all(
    movies.map(async (m) => {
      const reviews = await this.getMovieReview(m.id.toString());
      const trailer = await this.getTrailer(m.id, m.title ? "movie" : "tv");
      return {
        id: m.id,
        type: m.title ? "movie" : "tv",
        title: m.title || m.name,
        storyline: m.overview,
        backdrop: imagePath + m.backdrop_path,
        poster: imagePath + m.poster_path,
        trailer: trailer ? YOUTUBE_PATH + trailer : null,
        reviews,
      };
    })
  );
  return { movies: results };
};

exports.formatPersons = (persons) => {
  const results = persons.map((p) => {
    return {
      id: p.id,
      name: p.name,
      profile: TMDB_IMG_PATH + p.profile_path,
      known_for: p.known_for.map((m) => m.id),
    };
  });
  return { persons: results };
};

exports.formatReviews = async (movieId) => {
  const movie = await Movie.findOne({ tmdb_id: movieId })
    .populate({
      path: "reviews",
      populate: { path: "owner", select: "name" },
    })
    .select("reviews");

  if (!movie) return { error: "Movie not found!" };
  const reviews = movie.reviews.map((r) => {
    const { _id: reviewId, owner, content, rating, likes, dislikes } = r;
    const { _id: ownerId, name } = owner;
    return {
      id: reviewId,
      owner: {
        id: ownerId,
        name,
      },
      content,
      rating,
      likes,
      dislikes,
    };
  });
  return { reviews };
};

exports.getMoviesByAggregation = async (pipeline, type, genre) => {
  const movies = await Movie.aggregate(pipeline);
  const results = [];
  for (let m of movies) {
    const response = await axios.get(
      `${TMDB_API_URL}/${type}/${m.id}?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
    const { data } = response;
    const genres = data.genres.map((g) => parseInt(g.id));
    let canAdd = true;
    if (genre.length) {
      for (let g of genre.split(",")) {
        if (!genres.includes(parseInt(g))) {
          canAdd = false;
          break;
        }
      }
    }

    if (canAdd)
      results.push({
        id: m.id,
        title: type === "movie" ? data.title : data.name,
        storyline: data.overview,
        poster: TMDB_IMG_PATH + data.poster_path,
        reviews: await this.getMovieReview(m.id.toString()),
      });
  }
  return results;
};

exports.sortingPipeline = (sortingOrder, type, limit = 5) => {
  return [
    {
      $lookup: {
        from: "Movie",
        localField: "reviews",
        foreignField: "_id",
        as: "rated",
      },
    },
    {
      $match: { reviews: { $exists: true }, type: { $eq: type } },
    },
    {
      $project: {
        id: "$tmdb_id",
        ratingAvg: { $divide: ["$ratingSum", { $size: "$reviews" }] },
        reviewCount: { $size: "$reviews" },
      },
    },
    {
      $sort: sortingOrder,
    },
    {
      $limit: limit,
    },
  ];
};

exports.importMovie = async (movieId, type) => {
  let response;
  try {
    response = await axios.get(
      `${TMDB_API_URL}/${type}/${movieId}?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    );
  } catch (error) {
    const { response } = error;
    const { status_message } = response?.data;
    return { error, status_message, status: response.status };
  }

  const movie = response.data;
  const {
    id,
    overview,
    release_date,
    first_air_date,
    genres,
    spoken_languages,
    runtime,
    episode_run_time,
    backdrop_path,
    poster_path,
    created_by,
    homepage,
  } = movie;

  // get cast and director info
  response = await axios.get(
    `${TMDB_API_URL}/${type}/${movieId}/credits?api_key=${process.env.TMDB_API_KEY}&language=en-US`
  );
  const credits = response.data;
  if (!credits) return sendError(res, "Fetch failure!");
  let cast = credits.cast;
  cast = cast
    .filter((c, index) => index < 18)
    .map((c) => {
      return {
        id: c.id,
        name: c.name,
        profile: TMDB_IMG_PATH + c.profile_path,
        roleAs: c.character,
      };
    });

  const directors = [];
  const writers = [];
  const writerSet = new Set();
  for (let c of credits.crew) {
    if (c.job === "Director") {
      directors.push({ id: c.id, name: c.name });
    } else if (c.known_for_department === "Writing" && !writerSet.has(c.id)) {
      writerSet.add(c.id);
      writers.push({ id: c.id, name: c.name });
    }
  }

  // get trailer info
  const trailer_path = await this.getTrailer(id, type);

  const newMovie = new Movie({
    tmdb_id: id,
    title: type === "movie" ? movie.title : movie.name,
    type,
    storyline: overview,
    releaseDate: release_date || first_air_date,
    genres: genres.map((g) => g.id),
    languages: spoken_languages.map((l) => l.english_name),
    runtime: runtime || episode_run_time[0],
    backdrop: TMDB_IMG_PATH + backdrop_path,
    poster: TMDB_IMG_PATH + poster_path,
    trailer: trailer_path ? YOUTUBE_PATH + trailer_path : null,
    directors:
      created_by?.map((d) => ({ id: d.id, name: d.name })) || directors,
    cast,
    writers,
    reviews: [],
    homepage,
  });

  await newMovie.save();
  return newMovie;
};
