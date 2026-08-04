# Build stage
# Vite 7 requires Node >= 20.19; node:18 cannot build this app.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the Vite React app
COPY . .
# Empty base URL => the SPA fetches a relative /api/..., so one artifact works
# behind any hostname or port without a rebuild. See App.jsx.
ENV VITE_API_URL=""
RUN npm run build

# Serve stage
FROM nginx:alpine

# Config template — the entrypoint runs envsubst over /etc/nginx/templates/
# and writes the result to /etc/nginx/conf.d/. EIL_API_UPSTREAM is the only
# substituted variable; override it at run time to point elsewhere.
ENV EIL_API_UPSTREAM=backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
