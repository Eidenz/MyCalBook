/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Table to store the rules for how an event repeats
    .createTable('recurrence_rules', (table) => {
      table.increments('id').primary();
      // Frequency: e.g., 'WEEKLY', 'MONTHLY'
      table.string('frequency').notNullable(); 
      // Interval: e.g., repeats every 2 weeks
      table.integer('interval').defaultTo(1);
      // End Date: The recurrence stops on this date
      table.datetime('end_date'); 
      // Days of the week for weekly recurrence, e.g., 'MO,TU,WE'
      table.string('by_day'); 
      table.timestamps(true, true);
    })
    // Add columns to manual_events to support recurrence
    .then(() => 
      knex.schema.alterTable('manual_events', (table) => {
        // The "parent" event of a series points to a rule
        table.integer('recurrence_id').unsigned().references('id').inTable('recurrence_rules').onDelete('CASCADE');
        // An "exception" event points back to its parent event
        table.integer('parent_event_id').unsigned().references('id').inTable('manual_events').onDelete('CASCADE');
        // For an exception, this stores the original date of the occurrence it's overriding
        table.datetime('original_start_time'); 
        // A flag to mark a single occurrence as "deleted" from a series
        table.boolean('is_cancelled').defaultTo(false);
      })
    );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('manual_events', (table) => {
      table.dropColumn('recurrence_id');
      table.dropColumn('parent_event_id');
      table.dropColumn('original_start_time');
      table.dropColumn('is_cancelled');
    })
    .then(() => knex.schema.dropTableIfExists('recurrence_rules'));
};