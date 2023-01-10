const multer = require('multer');
const storage = multer.diskStorage({});

const imageFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image'))
        cb("Only image files are supported!", false);
    cb(null, true);
};

const videoFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('video'))
        cb("Only video files are supported!", false);
    cb(null, true);
};

exports.uploadImage = multer({ storage, imageFilter });
exports.uploadVideo = multer({ storage, videoFilter });