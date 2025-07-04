/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    // Stores the encrypted 2FA secret for the user.
    table.text('two_factor_secret');
    // A flag to indicate if 2FA has been successfully verified and is active.
    table.boolean('is_two_factor_enabled').notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('two_factor_secret');
    table.dropColumn('is_two_factor_enabled');
  });
};