/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('manual_events', (table) => {
      table.datetime('end_time').nullable().alter();
    })
    .alterTable('bookings', (table) => {
      table.datetime('end_time').nullable().alter();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Note: This down migration will fail if there are any NULL end_time values
  return knex.schema
    .alterTable('manual_events', (table) => {
      table.datetime('end_time').notNullable().alter();
    })
    .alterTable('bookings', (table) => {
      table.datetime('end_time').notNullable().alter();
    });
};
