/**
 * Persistent API keys for third-party integrations (e.g. desktop widgets,
 * scripts, automation). Unlike JWTs, these never expire until revoked.
 *
 * The full key is shown ONCE on creation and only its hash is stored.
 * `prefix` keeps the first few characters in plaintext so users can identify
 * which key is which in the management UI.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('api_keys', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('prefix').notNullable();
    table.string('hashed_key').notNullable().unique();
    table.datetime('last_used_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('api_keys');
};
