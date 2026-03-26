FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (prisma, tsc en devDependencies)
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client + build
RUN npx prisma generate && npm run build

# Production image
FROM node:20-alpine

# ffprobe/ffmpeg : miniatures vidéo + transcodage compat Firefox (H.264 yuv420p)
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Garder uniquement les dépendances de production
RUN npm prune --production

EXPOSE 3000

# Healthcheck (Node CJS -e)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.exit(r.statusCode===200?0:1));}).on('error',()=>process.exit(1))"

# Run
CMD ["node", "dist/index.js"]
