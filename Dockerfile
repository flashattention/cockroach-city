FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server ./server
COPY public ./public
ENV NODE_ENV=production PORT=8000 DATA_DIR=/data
EXPOSE 8000
CMD ["node", "server/index.js"]
