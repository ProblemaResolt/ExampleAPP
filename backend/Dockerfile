FROM node:20-alpine

# Install required dependencies
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "run", "dev"]