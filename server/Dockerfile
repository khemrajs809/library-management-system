# Stage 1: Build & Install
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install dependencies strictly from lockfile for reproducible builds
RUN npm ci --only=production

# Copy application source code
COPY . .

# Stage 2: Production Image
FROM node:24-alpine

# Set Node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy node_modules and built code from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package*.json ./

# Expose the API port
EXPOSE 5005

# Secure container by running as unprivileged node user
USER node

# Run the backend using standard node (no nodemon overhead in production)
CMD ["node", "src/index.js"]
