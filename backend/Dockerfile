FROM oven/bun:1.1.42

WORKDIR /app

COPY package.json package-lock.json ./
RUN bun install --production

COPY src ./src
COPY schema ./schema

EXPOSE 3001

CMD ["bun", "src/index.ts"]
