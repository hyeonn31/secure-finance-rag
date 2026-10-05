FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 poppler-utils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm install -g corepack@latest && corepack pnpm install && corepack pnpm run build
ENV NODE_ENV=production
# Inside the container the server must listen on all interfaces; publish the port
# on loopback only: docker run -p 127.0.0.1:3000:3000 -v rag-data:/app/data ...
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
