/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('manual_events', (table) => {
    // Add a new JSON column to store an array of guest names.
    table.json('guests');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('manual_events', (table) => {
    table.dropColumn('guests');
  });
};