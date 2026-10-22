FROM oven/bun:1.4

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json config.toml ./
COPY src ./src

ARG VERSION=dev
ENV VERSION=$VERSION
ENV NODE_ENV=production
ENV PORT=4100

EXPOSE 4100

CMD ["bun", "run", "src/index.ts"]
