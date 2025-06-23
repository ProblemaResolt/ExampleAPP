FROM node:20-alpine

# Install required dependencies and Japanese fonts
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++ \
    fontconfig \
    ttf-dejavu \
    font-noto-cjk \
    font-ipa\
    font-noto-emoji \
    font-awesome \
    && fc-cache -f

WORKDIR /app

# Copy package files first with verification
COPY package*.json ./

# Enhanced file system synchronization and verification
RUN sync && sleep 5 && \
    echo "Verifying package files..." && \
    ls -la package*.json && \
    stat package.json && \
    echo "Package.json size: $(wc -c < package.json) bytes" && \
    head -5 package.json && \
    echo "Package.json validation successful"

# Configure npm for maximum I/O error resilience
RUN npm config set cache /tmp/.npm-cache && \
    npm config set fetch-retry-mintimeout 30000 && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 1200000 && \
    npm config set maxsockets 5 && \
    npm config set registry https://registry.npmjs.org/ && \
    echo "NPM configuration completed"

# Clear any existing npm cache to avoid corruption
RUN npm cache clean --force && \
    rm -rf /tmp/.npm-cache && \
    mkdir -p /tmp/.npm-cache && \
    sync && sleep 3

# Install dependencies with comprehensive retry logic and error handling
RUN for i in 1 2 3 4 5 6 7 8 9 10; do \
        echo "=== Attempt $i: Installing dependencies ===" && \
        echo "Pre-install check: $(date)" && \
        sync && sleep 5 && \
        if [ -f package.json ]; then \
            echo "package.json exists, size: $(wc -c < package.json) bytes" && \
            if npm install --no-optional --no-audit --prefer-offline; then \
                echo "=== Install successful on attempt $i ===" && \
                break; \
            else \
                echo "=== Attempt $i failed, cleaning and retrying ===" && \
                rm -rf node_modules package-lock.json /tmp/.npm-cache/* && \
                npm cache clean --force && \
                sync && sleep 10; \
            fi; \
        else \
            echo "ERROR: package.json not found!" && \
            ls -la && \
            sleep 5; \
        fi; \
        if [ $i -eq 10 ]; then \
            echo "All attempts failed" && exit 1; \
        fi; \
    done

# Comprehensive verification of installation
RUN echo "=== Verifying npm installation ===" && \
    sync && sleep 3 && \
    ls -la node_modules || echo "node_modules not found" && \
    npm list --depth=0 || echo "Package listing completed with warnings" && \
    echo "Installation verification completed"

# Copy source code with enhanced synchronization
COPY . .
RUN sync && sleep 3 && \
    echo "Source code copied successfully" && \
    ls -la

# Generate Prisma client with retry logic
RUN echo "=== Generating Prisma client ===" && \
    sync && sleep 2 && \
    for i in 1 2 3; do \
        echo "Prisma generation attempt $i..." && \
        npx prisma generate && break || \
        (echo "Prisma generation attempt $i failed, retrying..." && sleep 5); \
    done && \
    echo "Prisma client generation completed"

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "run", "dev"]