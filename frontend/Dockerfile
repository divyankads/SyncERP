# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass the backend URL at build time
ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─── Production stage (Nginx) ─────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: all unknown paths → index.html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  gzip on;\n\
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:80 || exit 1
