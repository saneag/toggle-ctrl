FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.24.0
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM dependencies AS api-build
COPY apps/api ./apps/api
# Prisma config requires a URL during generation; no database is contacted.
RUN DATABASE_URL=postgresql://build:build@localhost/build pnpm --filter api build

FROM api-build AS migration
WORKDIR /app/apps/api
USER node
CMD ["pnpm", "exec", "prisma", "migrate", "deploy", "--schema", "prisma"]

FROM api-build AS api
ENV NODE_ENV=production PORT=5000
WORKDIR /app/apps/api
USER node
EXPOSE 5000
CMD ["node", "dist/main.js"]

FROM dependencies AS web-build
COPY apps/web ./apps/web
ENV VITE_API_URL=/api
RUN pnpm --filter web build

FROM nginx:stable-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
