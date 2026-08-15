/**
 * Frozen role set — API_CONTRACT.md §1, RULES.md §4.
 * Exactly these four for Phase 1. No `supervisor`, no new role — even though
 * the original feature doc mentions a Supervisor role, v1.2 explicitly
 * removed it. If a task seems to need a new role, stop and flag it (RULES §4)
 * instead of adding one here.
 *
 * `public` is NOT a stored User.role value — it means "no account / no auth
 * header", not an account type. USER_ROLES (below) is the enum actually
 * persisted on the User model; ALL_ROLES includes 'public' for places (like
 * role-check helper text) that need to reason about the full access model.
 */
const USER_ROLES = Object.freeze(['citizen', 'staff', 'admin']);
const ALL_ROLES = Object.freeze(['public', ...USER_ROLES]);

module.exports = { USER_ROLES, ALL_ROLES };
