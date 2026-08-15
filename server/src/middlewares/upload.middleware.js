const multer = require('multer');
const ApiError = require('../utils/apiError');

// API_CONTRACT.md §6: multipart/form-data, field name "image",
// image/jpeg or image/png only, 5MB max. Memory storage — the buffer is
// streamed straight to Cloudinary (uploads.service.js), never written to
// disk and never stored in MongoDB.
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Only image/jpeg and image/png are accepted.'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
});

/**
 * Wraps multer's single-file handler so its errors (wrong field name, file
 * too large, etc.) go through the same ApiError → error.middleware.js path
 * as everything else, instead of multer's own default error shape.
 */
function singleImageUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'FILE_TOO_LARGE', 'Image must be 5MB or smaller.'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(400, 'INVALID_FIELD_NAME', 'Upload the file under the "image" field.'));
    }
    return next(new ApiError(400, 'UPLOAD_ERROR', err.message || 'Upload failed.'));
  });
}

module.exports = { singleImageUpload };
