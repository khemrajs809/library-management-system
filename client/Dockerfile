# Stage 1: Build the Angular App
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files and install ALL dependencies (including devDependencies for Angular CLI)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Angular application for production (SSR and Prerendering)
RUN npm run build

# Stage 2: Production SSR Server
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy ONLY the compiled dist folder and necessary server files from the builder stage
COPY --from=builder /usr/src/app/dist/client ./dist/client
COPY --from=builder /usr/src/app/package*.json ./

# The Angular SSR server requires express and other dependencies locally if they aren't bundled.
# However, Angular 17+ SSR bundles everything into server.mjs using esbuild, so no npm install is needed here!

# Expose the default SSR port
EXPOSE 4000

# Secure container by running as unprivileged node user
USER node

# Start the SSR server
CMD ["node", "dist/client/server/server.mjs"]
