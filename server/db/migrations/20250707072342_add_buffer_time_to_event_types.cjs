/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    // Add a column to store buffer time in minutes.
    // Defaulting to 0 maintains existing behavior for old event types.
    table.integer('buffer_time').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    table.dropColumn('buffer_time');
  });
};