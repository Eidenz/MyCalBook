#!/bin/sh
set -e

echo "Running database migrations for production environment..."

# Explicitly use the 'production' environment.
npm --prefix server run knex migrate:latest -- --env production

echo "Migrations complete. Starting server..."

# This remains the same. The running Node.js app will correctly pick up the
# 'production' environment because of NODE_ENV in docker-compose.
exec "$@"