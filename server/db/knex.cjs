const knex = require('knex');
const config = require('../knexfile.cjs');

// We are using the 'development' environment configuration
const db = knex(config.development);

module.exports = db;