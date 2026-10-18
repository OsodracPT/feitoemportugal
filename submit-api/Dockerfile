# Reference image for the submission service. Build from the repository root so
# the workspace dependency @fep/schema and the taxonomy in data/ come along:
#
#   docker build -f submit-api/Dockerfile -t fep-submit .
#
# The service runs the TypeScript directly through Node's type stripping (no
# build step) and uses the built-in node:sqlite, hence --experimental-sqlite.
FROM node:24-alpine

WORKDIR /app
RUN corepack enable

# Manifests first, so a dependency install is cached until they change.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/schema/package.json packages/schema/
COPY submit-api/package.json submit-api/
RUN pnpm install --filter @fep/submit-api... --prod --frozen-lockfile

# Source and the taxonomy the brand converter validates against. The list of
# existing brands is read at runtime from SITE_ORIGIN, not baked in.
COPY packages/schema packages/schema
COPY submit-api submit-api
COPY data data

# DATA_DIR points at the bundled taxonomy; the SQLite file lives on a volume.
ENV NODE_ENV=production \
    DATA_DIR=/app/data \
    DB_PATH=/data/submissions.db \
    PORT=8787
EXPOSE 8787

# A non-root user owns the SQLite volume.
RUN addgroup -S fep && adduser -S fep -G fep && mkdir -p /data && chown fep:fep /data
USER fep
VOLUME /data

CMD ["node", "--experimental-sqlite", "submit-api/src/server.ts"]
