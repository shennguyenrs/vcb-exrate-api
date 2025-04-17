# Base stage
FROM debian:12.10-slim AS base
WORKDIR /usr/src/app

# Install system dependencies for Chromium/Puppeteer and Bun
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    # libgtk-3-0 might require more deps, install chromium first then see if needed
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    lsb-release \
    xdg-utils \
    # Other dependencies often needed
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    # Bun dependencies
    unzip \
    # --- Chromium Install ---
    && echo "Attempting to install Chromium..." \
    && apt-get install -y --no-install-recommends chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && echo "Base stage dependencies installed successfully."

# Create bun user and set up home directory
RUN useradd -m -u 1000 -s /bin/bash bun && \
    chown -R bun:bun /home/bun /usr/src/app

# Switch to bun user
USER bun

# Install Bun as bun user to ensure accessibility
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH for bun user
ENV PATH="/home/bun/.bun/bin:$PATH"

# Install stage
FROM base AS install
USER root
RUN mkdir -p /temp/dev && chown bun:bun /temp/dev
USER bun
WORKDIR /temp/dev
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --frozen-lockfile

# Prerelease stage
FROM base AS prerelease
USER root
COPY --from=install /temp/dev/node_modules /usr/src/app/node_modules
COPY . /usr/src/app/
RUN chown -R bun:bun /usr/src/app
USER bun
WORKDIR /usr/src/app
RUN bun run build

# Release stage
FROM base AS release
USER root

# Copy necessary artifacts
COPY --from=install /temp/dev/node_modules /usr/src/app/node_modules
COPY --from=prerelease /usr/src/app/dist /usr/src/app/dist
COPY --from=prerelease /usr/src/app/package.json /usr/src/app/package.json
COPY --from=prerelease /usr/src/app/tsconfig.json /usr/src/app/tsconfig.json

WORKDIR /usr/src/app
RUN chown -R bun:bun /usr/src/app /home/bun

# --- Set the path explicitly via ENV var ---
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "dist/index.js"]