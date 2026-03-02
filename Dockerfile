FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ .

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
