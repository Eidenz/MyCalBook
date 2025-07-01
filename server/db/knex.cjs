const knex = require('knex');
const config = require('../knexfile.cjs');

// Read the NODE_ENV variable to determine which configuration to use.
// Defaults to 'development' if NODE_ENV is not set.
const environment = process.env.NODE_ENV || 'development';

// Export the knex instance with the correct configuration.
const db = knex(config[environment]);

module.exports = db;