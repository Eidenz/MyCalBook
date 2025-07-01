/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Chain two operations: 1. Add the column. 2. Update existing rows.
  return knex.schema.alterTable('event_types', (table) => {
    // We make it nullable temporarily to add it.
    table.boolean('is_public');
  })
  .then(() => {
    // Now, update all existing rows to be public by default.
    // Then, alter the column to be not-nullable with a default.
    return knex('event_types').update({ is_public: true });
  })
  .then(() => {
    // Finally, make the column not-nullable and set the default for future inserts.
    return knex.schema.alterTable('event_types', (table) => {
      table.boolean('is_public').notNullable().defaultTo(true).alter();
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    table.dropColumn('is_public');
  });
};