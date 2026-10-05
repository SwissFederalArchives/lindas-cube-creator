# MinIO images for development and CI

Lando and the test, e2e, and offline Compose configurations use the public
`cgr.dev/chainguard/minio` and `cgr.dev/chainguard/minio-client` images. No private
registry or registry login is required.

The previous Quay images were freshly pulled in the successful September 22,
2026 CI run, but anonymous pulls subsequently failed. Changing the registry
addresses that failure. Pinning both images by their multi-platform manifest
digests prevents later changes to `latest-dev` from changing an existing checkout.
The pins support Linux AMD64 and ARM64.

The `-dev` variant includes the shell and tools needed by Lando and the bucket
initialization scripts. The server starts through `/usr/bin/minio`; its image
also supplies `mc` for the readiness check and `wget` for the HTTP health check.
The server explicitly retains the previous image's root user so existing
volumes do not lose write access when switching to an image that defaults to
UID 65532. The initializer can use the new image's default user.
An existing Lando installation needs `lando rebuild` to apply image and user
changes; `lando start` can reuse containers from the previous configuration.
The Red Hat certificate-update override used by the previous image is not
compatible with the replacement image and is no longer mounted.

## Updating the images

`renovate.json` groups digest updates for both images across all four
configurations into reviewed PRs, with automatic merging disabled. This requires
Renovate to be enabled for the GitHub repository. Its configuration is limited to
these MinIO references. CI pipeline tests must pass; they no longer allow failures
through `continue-on-error`.

Updates can also be made without Renovate:

1. Pull the current candidates and record the `Digest:` values:

   ```sh
   docker pull cgr.dev/chainguard/minio:latest-dev
   docker pull cgr.dev/chainguard/minio-client:latest-dev
   ```

2. Update each image's digest in `.lando.yml`, `docker-compose.test.yml`,
   `docker-compose.e2e.yml`, and `docker-compose.offline.yml`. Retain the
   `latest-dev@sha256:...` reference format. Record the server version using
   `docker run --rm cgr.dev/chainguard/minio@sha256:<digest> --version`.
3. Run the isolated bucket initialization check:

   ```sh
   docker compose -p minio-image-check -f docker-compose.test.yml \
     up --exit-code-from minio-init minio-init
   docker compose -p minio-image-check -f docker-compose.test.yml down
   ```

   This starts only MinIO and its initializer. Run it when the fixed
   `cc-test-minio` and `cc-test-minio-init` container names and ports 9000/9001
   are free. It uploads the test fixture and checks server readiness.
4. Open a PR and require all CI jobs to pass, including the CLI import, publish,
   transform, timeout, SPARQL, and UI e2e tests. Lando startup alone does not
   validate application compatibility.

The initial change upgrades the server from the 2023 release to
`RELEASE.2026-09-22T19-25-18Z`. Fresh test storage is validated separately from
existing data: back up an existing MinIO volume and validate the upgrade against
a copy before using the new image with that volume. Do not assume that reverting
the image also reverts any on-disk changes.

## Availability and maintenance

Digest pins control image contents, not registry availability. The current pins
and an older tested Chainguard pair were remotely accessible during validation,
but this does not guarantee indefinite retention. If a pin becomes unavailable,
review and test a new digest using the process above. If the public image offering
ends, reassess the maintained source distribution rather than silently switching
to a moving tag or an unrelated mirror.

Chainguard publishes these MinIO images in its free tier and maintains a MinIO
fork. Its maintenance scope is best effort and does not promise new features.
This configuration needs no image publishing workflow.

References:

- [Free MinIO images](https://www.chainguard.dev/unchained/secure-and-free-minio-chainguard-containers)
- [Digest pins and development variants](https://edu.chainguard.dev/chainguard/containers/using-and-deploying/using-containers/)
- [Maintained MinIO source](https://github.com/chainguard-forks/minio)
- [Renovate custom manager](https://docs.renovatebot.com/modules/manager/regex/)
