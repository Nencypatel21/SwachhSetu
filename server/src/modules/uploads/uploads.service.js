const cloudinary = require('../../config/cloudinary');
const ApiError = require('../../utils/apiError');

/**
 * §6 — uploads the multer-buffered image to Cloudinary via an upload stream
 * (no temp file on disk, buffer never touches MongoDB). Exported separately
 * from the HTTP-facing controller so B9 (WhatsApp) can call this exact same
 * function internally after fetching media from the Meta Graph API — per
 * the architecture note, WhatsApp must never call the public HTTP endpoint
 * server-to-server.
 */
function uploadBuffer(buffer, { folder = 'reports' } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(new ApiError(502, 'UPLOAD_FAILED', 'Image upload to Cloudinary failed.'));
        return resolve({ imageUrl: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/** §6 POST /uploads/report-image */
async function uploadReportImage(file) {
  if (!file) {
    throw new ApiError(400, 'NO_FILE', 'No image file was provided under the "image" field.');
  }
  return uploadBuffer(file.buffer, { folder: 'reports' });
}

module.exports = { uploadBuffer, uploadReportImage };
