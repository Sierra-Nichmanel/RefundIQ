
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

# Generate Prisma Client
RUN npx prisma generate

# Copy backend source code
COPY tsconfig.json ./
COPY src ./src

EXPOSE 5000

CMD ["npm", "run", "dev"]