const mongoose = require('mongoose');

/**
 * Backing store for utils/idGenerator.js. One document per counter key
 * (e.g. "report-2026", "vehicle", "user", "route", "auditlog"); each call
 * atomically increments `seq` via findByIdAndUpdate($inc), which is safe
 * under concurrent writes (no read-then-write race).
 *
 * Internal only — never exposed via any API response.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
