# First step: build the assets
FROM node:22-alpine3.19 AS builder

WORKDIR /app
ADD package.json yarn.lock ./
ADD ./patches ./patches/
ADD ./apis/core/package.json ./apis/core/
ADD ./apis/errors/package.json ./apis/errors/
ADD ./apis/shared-dimensions/package.json ./apis/shared-dimensions/
ADD ./packages/core/package.json ./packages/core/
ADD ./packages/express/package.json ./packages/express/
ADD ./packages/model/package.json ./packages/model/
ADD ./packages/testing/package.json ./packages/testing/
ADD ./packages/express-rdf-request/package.json ./packages/express-rdf-request/
ADD ./packages/shacl-middleware/package.json ./packages/shacl-middleware/

# for every new package foo add:
# ADD ./packages/foo/package.json ./packages/foo/

# install dependencies
RUN yarn install && yarn cache clean

COPY . .
RUN rm -rf ./ui
RUN rm -rf ./cli
RUN rm -rf ./e2e-ui

# Compile TypeScript with CommonJS output
RUN node --max-old-space-size=4096 --stack-size=8192 ./node_modules/.bin/tsc \
    --outDir dist \
    --module CommonJS \
    --moduleResolution node \
    --esModuleInterop true \
    --noEmitOnError false || true

FROM node:22-alpine3.19

WORKDIR /app

ADD package.json yarn.lock ./
ADD ./apis/core/package.json ./apis/core/
ADD ./apis/errors/package.json ./apis/errors/
ADD ./apis/shared-dimensions/package.json ./apis/shared-dimensions/
ADD ./packages/core/package.json ./packages/core/
ADD ./packages/express/package.json ./packages/express/
ADD ./packages/model/package.json ./packages/model/
ADD ./packages/testing/package.json ./packages/testing/
ADD ./packages/express-rdf-request/package.json ./packages/express-rdf-request/
ADD ./packages/shacl-middleware/package.json ./packages/shacl-middleware/

# for every new package foo add
#ADD ./packages/foo/package.json ./packages/foo/

RUN yarn install --production && yarn cache clean
COPY --from=builder /app/dist/apis ./apis/
COPY --from=builder /app/dist/packages/ ./packages/

ADD apis/core/hydra/*.ttl ./apis/core/hydra/
ADD apis/shared-dimensions/hydra/*.ttl ./apis/shared-dimensions/hydra/
ADD apis/shared-dimensions/lib/domain/shared-dimension/importShapes.ttl ./apis/shared-dimensions/lib/domain/shared-dimension/
ADD apis/shared-dimensions/lib/store/shapes.ttl ./apis/shared-dimensions/lib/store/shapes.ttl
ADD apis/shared-dimensions/lib/shapes/*.ttl ./apis/shared-dimensions/lib/shapes/

# for every new hydra api "foo" add
#ADD apis/foo/hydra/*.ttl ./apis/foo/hydra/

RUN apk add --no-cache tini
ENTRYPOINT ["tini", "--"]

EXPOSE 45670

# build with `docker build --build-arg COMMIT=$(git rev-parse HEAD)`
ARG COMMIT
ENV SENTRY_RELEASE=cube-creator-api@$COMMIT

# Have some logs by default
# This should be kept in sync with .lando.yml
ENV DEBUG=creator*,hydra*,hydra-box*,labyrinth*

HEALTHCHECK --timeout=5s --interval=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:45670/api/', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# USER nobody. Needs to be a numeric UID, else the "runAsNonRoot" security
# directive in Kubernetes does not work.
USER 65534

WORKDIR /app
# Use experimental require module flag to allow requiring ESM packages from CommonJS
CMD ["node", "--experimental-require-module", "apis/core/index.js"]
