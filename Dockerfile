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
# Répertoires cache nginx : requis si le process tourne en USER nginx (sinon mkdir client_temp → EACCES).
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh \
  && chown -R nginx:nginx /usr/share/nginx/html \
  && mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
  && chown -R nginx:nginx /var/cache/nginx

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
