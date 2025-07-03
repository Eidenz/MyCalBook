/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('manual_events', (table) => {
    // This column will link a manual event back to the booking it was created from.
    // ON DELETE CASCADE means if the booking is deleted, this manual event will be automatically deleted too.
    table.integer('booking_id').unsigned().references('id').inTable('bookings').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('manual_events', (table) => {
    // The 'alterTable' syntax for dropping a foreign key can vary by DB.
    // This is a common way for Knex.
    table.dropForeign('booking_id');
    table.dropColumn('booking_id');
  });
};