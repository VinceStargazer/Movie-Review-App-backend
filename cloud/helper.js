const cloudinary = require("./index");

exports.uploadAvatar = async (file) => {
  const { secure_url: url, public_id } = await cloudinary.uploader.upload(
    file.path,
    { gravity: "face", height: 500, width: 500, crop: "thumb" }
  );
  return { url, public_id };
};

exports.uploadPoster = async (file) => {
  const {
    secure_url: url,
    public_id,
    responsive_breakpoints,
  } = await cloudinary.uploader.upload(file.path, {
    transformation: {
      width: 1280,
      height: 720,
    },
    responsive_breakpoints: {
      create_derived: true,
      max_width: 640,
      max_images: 3,
    },
  });
  const poster = { url, public_id, responsive: [] };
  const { breakpoints } = responsive_breakpoints[0];
  if (breakpoints.length) {
    for (let img of breakpoints) poster.responsive.push(img.secure_url);
  }
  return poster;
};

exports.removeFromCloud = async (public_id, resource_type="image") => {
  const { result } = await cloudinary.uploader.destroy(public_id, { resource_type });
  if (result !== "ok") return { error: `Could not remove ${resource_type} from cloud!` };
  return { message: "Item removed successfully" };
};
