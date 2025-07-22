# Multi-stage Dockerfile for YouTube Clip Edit Tool
# Stage 1: Base image with system dependencies
FROM node:20-alpine AS base

# Install system dependencies including FFmpeg and Python
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    bash \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    pkgconfig \
    make \
    g++

# Install UV for Python package management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Stage 2: Python dependencies
FROM base AS python-deps

WORKDIR /app

# Copy Python dependency files
COPY pyproject.toml uv.lock* ./

# Install Python dependencies using UV from base image
RUN uv venv .venv && \
    uv pip install --no-cache -e .

# Stage 3: Node.js build stage
FROM base AS node-build

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install Node.js dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Copy Python virtual environment from python-deps stage
COPY --from=python-deps /app/.venv /app/.venv

# Build the Next.js application
RUN bun run build

# Stage 4: Production runtime
FROM node:20-alpine AS runtime

# Install only essential runtime dependencies
RUN apk add --no-cache \
    python3 \
    ffmpeg \
    dumb-init \
    curl \
    bash

# Install Bun for production
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=node-build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=node-build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=node-build --chown=nextjs:nodejs /app/public ./public
COPY --from=node-build --chown=nextjs:nodejs /app/scripts ./scripts

# Copy Python virtual environment
COPY --from=python-deps --chown=nextjs:nodejs /app/.venv ./.venv

# Ensure the Python virtual environment is in PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/.venv/lib/python3.11/site-packages"

# Create directories with proper permissions
RUN mkdir -p /tmp/videos && \
    chown -R nextjs:nodejs /tmp/videos && \
    chmod 755 /tmp/videos

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "start"]