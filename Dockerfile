# Frontend AfriWonder — build Vite + nginx
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build frontend sans URL API hardcodée (12-factor).
# L'URL runtime est injectée dans /usr/share/nginx/html/config.json au démarrage.
RUN npm run build

# Image de prod : nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh \
  && chown -R nginx:nginx /usr/share/nginx/html

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
