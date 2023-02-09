const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { errorHandler } = require("./middlewares/error");
const { handleNotFound } = require("./utils/helper");
const userRouter = require("./routes/user");
const personRouter = require("./routes/person");
const movieRouter = require("./routes/movie");
const reviewRouter = require("./routes/review");

require("express-async-errors");
require("dotenv").config();
require("./db");

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(errorHandler);

app.use("/api/user", userRouter);
app.use("/api/person", personRouter);
app.use("/api/movie", movieRouter);
app.use("/api/review", reviewRouter);
app.use("/*", handleNotFound);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});
