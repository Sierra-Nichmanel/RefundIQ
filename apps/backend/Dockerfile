
FROM node:22-alpine

WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

# Copy backend dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and configuration
COPY prisma ./prisma
COPY prisma.config.ts ./

# Provide a build-time placeholder for Prisma config loading.
# Docker Compose supplies the real DATABASE_URL at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/refundiq?schema=public"

# Generate Prisma Client
RUN npx prisma generate

# Copy backend source code
COPY tsconfig.json ./
COPY src ./src

EXPOSE 5000

CMD ["npm", "run", "dev"]