// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  // This is used for local development (`npm run dev`)
  development: {
    client: 'sqlite3',
    connection: {
      filename: './mycalbook.sqlite3' // Relative path for local dev
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done);
      }
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },

  // This is the single configuration for the Docker environment
  production: {
    client: 'sqlite3',
    connection: {
      // The absolute path to the database file INSIDE the container.
      // This path is mapped to a host directory by the volume in docker-compose.
      filename: '/app/server/database/mycalbook.sqlite3'
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done);
      }
    },
    migrations: {
      directory: './db/migrations'
    }
  }
};