/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // --- Users Table ---
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.timestamps(true, true);
    })
    // --- Availability Schedules (e.g., "Weekday Hours", "Weekend Hours") ---
    .createTable('availability_schedules', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.timestamps(true, true);
    })
    // --- Weekly Recurring Availability Rules ---
    .createTable('availability_rules', (table) => {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('availability_schedules').onDelete('CASCADE');
      table.integer('day_of_week').notNullable(); // 0 = Sunday, 1 = Monday, etc.
      table.time('start_time').notNullable();
      table.time('end_time').notNullable();
    })
    // --- One-off Overrides for specific dates ---
    .createTable('availability_overrides', (table) => {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('availability_schedules').onDelete('CASCADE');
      table.date('date').notNullable();
      table.time('start_time'); // Nullable to allow blocking a whole day
      table.time('end_time');   // Nullable to allow blocking a whole day
      table.boolean('is_unavailable').defaultTo(false);
    })
    // --- Event Types (the bookable pages like "30-min Cuddle") ---
    .createTable('event_types', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('availability_schedules').onDelete('CASCADE');
      table.string('title').notNullable();
      table.string('slug').notNullable().unique();
      table.integer('duration').notNullable(); // in minutes
      table.string('location').defaultTo('VRChat');
      table.timestamps(true, true);
    })
    // --- Bookings (Confirmed appointments) ---
    .createTable('bookings', (table) => {
      table.increments('id').primary();
      table.integer('event_type_id').unsigned().notNullable().references('id').inTable('event_types').onDelete('CASCADE');
      table.datetime('start_time').notNullable();
      table.datetime('end_time').notNullable();
      table.string('booker_name').notNullable();
      table.string('booker_email');
      table.text('notes');
      table.timestamps(true, true);
    })
    // --- Manual Events (Personal, Blocked Time) ---
    .createTable('manual_events', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('title').notNullable();
      table.datetime('start_time').notNullable();
      table.datetime('end_time').notNullable();
      table.string('type').notNullable().defaultTo('personal');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('manual_events')
    .dropTableIfExists('bookings')
    .dropTableIfExists('event_types')
    .dropTableIfExists('availability_overrides')
    .dropTableIfExists('availability_rules')
    .dropTableIfExists('availability_schedules')
    .dropTableIfExists('users');
};