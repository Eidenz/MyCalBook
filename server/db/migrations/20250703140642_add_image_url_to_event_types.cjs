/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    // Add a column to store the URL of the event type's image.
    table.string('image_url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    table.dropColumn('image_url');
  });
};