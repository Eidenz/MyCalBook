/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    // We will store the selectable durations as a JSON array of numbers.
    // e.g., '[30, 60, 90]'
    table.json('durations').notNullable().defaultTo('[]');
    
    // The default duration selected on the booking page.
    table.integer('default_duration').notNullable().defaultTo(30);

    // A text field for the event description.
    table.text('description');

    // Drop the old single duration column.
    table.dropColumn('duration');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('event_types', (table) => {
    // Re-create the old 'duration' column if we roll back.
    table.integer('duration').notNullable().defaultTo(30);

    // Drop the new columns.
    table.dropColumn('durations');
    table.dropColumn('default_duration');
    table.dropColumn('description');
  });
};