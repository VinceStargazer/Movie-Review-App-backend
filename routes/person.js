const express = require("express");
const { uploadImage } = require("../middlewares/multer");
const { actorValidator, validate } = require("../middlewares/validator");
const {
  create,
  update,
  remove,
  search,
  getLatest,
  getSingle,
  getPopular,
  getPerson,
  getPersonImages,
} = require("../controllers/person");
const { isAuth, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router.post(
  "/create",
  isAuth,
  isAdmin,
  uploadImage.single("avatar"),
  actorValidator,
  validate,
  create
);
router.post(
  "/update/:actorId",
  isAuth,
  isAdmin,
  uploadImage.single("avatar"),
  actorValidator,
  validate,
  update
);
router.delete("/:actorId", isAuth, isAdmin, remove);
router.get("/search", search);
router.get("/get-latest", isAuth, isAdmin, getLatest);
router.get("/single/:actorId", getSingle);

router.get("/popular", getPopular);
router.get("/:personId", getPerson);
router.get("/:personId/images", getPersonImages);

module.exports = router;
