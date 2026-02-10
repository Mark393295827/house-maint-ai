FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build TypeScript to JavaScript
RUN npm run build
# Create data and uploads directories
RUN mkdir -p data uploads
EXPOSE 3001
CMD ["npm", "start"]
