// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './mycalbook.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },

  // This configuration is ONLY for the docker-entrypoint.sh script.
  // It uses absolute paths and removes all ambiguity.
  docker: {
    client: 'sqlite3',
    connection: {
      // Hardcode the path exactly as it is inside the container.
      filename: '/app/server/database/mycalbook.sqlite3'
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done);
      }
    },
    migrations: {
      // Use an absolute path here as well.
      directory: '/app/server/db/migrations'
    }
  },

  // This is what the running application will use.
  // It correctly reads from the environment variables set by docker-compose.
  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL
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