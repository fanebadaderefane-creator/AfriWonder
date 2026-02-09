# Frontend AfriWonder — build Vite + nginx
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build (API URL depuis env au moment du build)
ARG VITE_API_URL=https://api.afriwonder.com
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Image de prod : nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
