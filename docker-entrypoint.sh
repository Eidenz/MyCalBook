#!/bin/sh
set -e

echo "Running database migrations..."

# Explicitly use the 'docker' environment we created in the knexfile.
# This configuration has hardcoded paths and no dependencies on shell environment variables.
knex migrate:latest --knexfile /app/server/knexfile.cjs --env docker

echo "Migrations complete. Starting server..."

# This remains the same. The running Node.js app will correctly pick up the
# environment variables from docker-compose for its own database connection.
exec "$@"