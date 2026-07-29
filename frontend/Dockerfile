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

# Do NOT set NODE_ENV=production before install — that omits many build tools.
# typescript is also in dependencies as a safety net for Next builds.
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=1536"
# next build expects production env
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
