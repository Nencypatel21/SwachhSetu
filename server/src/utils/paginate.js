/**
 * Shared pagination helper — API_CONTRACT.md §3:
 *   ?page=1&limit=20 → "pagination": { page, limit, totalItems, totalPages }
 *
 * New in B4 (not part of the original B0 utils list) — added here rather than
 * duplicated in reports.service.js and vehicles.service.js since both B4 and
 * B5 list endpoints need the identical shape. Flagged in MEMORY_BACKEND.md.
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginationMeta({ page, limit, totalItems }) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  };
}

module.exports = { parsePagination, buildPaginationMeta };
