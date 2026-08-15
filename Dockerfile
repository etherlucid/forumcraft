FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Run command deployment on startup, then launch bot
CMD ["sh", "-c", "npm run deploy && npm start"]
