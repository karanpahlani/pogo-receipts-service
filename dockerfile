FROM node:20-alpine

WORKDIR /app

# pnpm
RUN corepack enable

# copy manifests first for better caching
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# app
COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000
CMD ["pnpm", "dev"]