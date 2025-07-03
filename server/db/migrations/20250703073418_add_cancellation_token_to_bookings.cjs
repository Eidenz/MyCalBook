/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('bookings', (table) => {
    // Add a token for secure, unauthenticated cancellations.
    // It's made unique to prevent any potential conflicts.
    table.string('cancellation_token').unique();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('cancellation_token');
  });
};