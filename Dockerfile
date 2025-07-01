# ---- Stage 1: Build the React Client ----
# Use a Node.js image as the base for the builder stage
FROM node:22-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json for both client and server
# This leverages Docker's layer caching
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies for the client
RUN npm --prefix client install

# Copy the rest of the client source code
COPY client/ ./client/

# Build the client app, creating the /app/client/dist folder
RUN npm --prefix client run build


# ---- Stage 2: Build the Production Server ----
# Start fresh with a lean Node.js image
FROM node:22-alpine AS production

WORKDIR /app

# Install Knex globally within the image so the entrypoint script can use it.
RUN npm install -g knex

# Copy server package files
COPY server/package*.json ./server/

# Install ONLY production dependencies for the server
RUN npm --prefix server install --omit=dev

# Copy the server source code
COPY server/ ./server/

# Copy the built client from the 'builder' stage
COPY --from=builder /app/client/dist ./client/dist

# Copy the entrypoint script and make it executable
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# Expose the port the app runs on
EXPOSE 5001

# Set the entrypoint to run our script
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# The command to run when the container starts
CMD ["node", "server/index.cjs"]