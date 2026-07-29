FROM node:20-alpine

WORKDIR /app

# Optional mirror if registry.npmjs.org times out, e.g.:
#   docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY" \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm config set maxsockets 3

COPY package*.json ./
# Keep devDependencies: `prestart` runs babel/rimraf before `npm start`.
RUN npm ci || npm install

COPY . .

EXPOSE 8000
CMD ["npm", "start"]
