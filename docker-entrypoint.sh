#!/bin/sh
set -e

echo "Running database migrations for production..."

# Use the new, dedicated production migration script.
npm --prefix server run db:migrate:prod

echo "Migrations complete. Starting server..."

# This remains the same.
exec "$@"