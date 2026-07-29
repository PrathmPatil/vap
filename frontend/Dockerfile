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

# NEXT_PUBLIC_* must be present at build time (baked into the JS bundle).
# Runtime env_file alone will NOT fix login / API calls.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PYTHON_API_URL
ARG NEXT_PUBLIC_BACKEND_API
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_PYTHON_API_URL=$NEXT_PUBLIC_PYTHON_API_URL \
    NEXT_PUBLIC_BACKEND_API=$NEXT_PUBLIC_BACKEND_API

ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_ENV=production
RUN if [ -z "$NEXT_PUBLIC_API_URL" ] && [ -z "$NEXT_PUBLIC_BACKEND_API" ]; then \
      echo "ERROR: NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_BACKEND_API) must be set as a build-arg" >&2; \
      exit 1; \
    fi \
 && npm run build

EXPOSE 3000
CMD ["npm", "start"]
