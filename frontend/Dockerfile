FROM node:20-alpine

WORKDIR /app

# Optional mirror if registry.npmjs.org times out:
#   docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY" \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm config set maxsockets 3

COPY package*.json ./

# CRITICAL: do NOT set NODE_ENV=production before install.
# Production mode omits devDependencies (typescript), then `next build`
# tries to auto-install typescript without --legacy-peer-deps and fails
# on React 19 / cmdk peer conflicts.
ENV NODE_ENV=development

RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
