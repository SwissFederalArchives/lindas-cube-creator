# First step: build the assets
FROM node:18.19.1-alpine3.19 AS builder

WORKDIR /app
COPY package.json yarn.lock ./
COPY ./cli/package.json ./cli/
COPY ./packages/core/package.json ./packages/core/
COPY ./packages/model/package.json ./packages/model/
COPY ./packages/testing/package.json ./packages/testing/

# for every new package foo add:
# COPY ./packages/foo/package.json ./packages/foo/

# install and build backend
RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .
RUN rm -rf ./ui ./apis ./cli/test ./packages/model/test \
    ./packages/testing ./packages/express ./packages/express-rdf-request \
    ./packages/shacl-middleware

RUN yarn tsc --outDir dist --module CommonJS

FROM node:18.19.1-alpine3.19

WORKDIR /app

COPY package.json yarn.lock ./
COPY ./cli/package.json ./cli/
COPY ./cli/*.ttl ./cli/
COPY ./cli/pipelines ./cli/pipelines/
COPY ./packages/core/package.json ./packages/core/
COPY ./packages/model/package.json ./packages/model/
COPY ./packages/testing/package.json ./packages/testing/

# for every new package foo add
#COPY ./packages/foo/package.json ./packages/foo/

RUN yarn install --production --frozen-lockfile && yarn cache clean
COPY --from=builder /app/dist/cli ./cli/
COPY --from=builder /app/dist/packages/ ./packages/

EXPOSE 8080
USER node

# build with `docker build --build-arg COMMIT=$(git rev-parse HEAD)`
ARG COMMIT
ENV SENTRY_RELEASE=cube-creator-cli@$COMMIT

ENTRYPOINT ["node", "--unhandled-rejections=strict", "cli/index.js"]
