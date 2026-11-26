# Proposing an organisation

The **Propose organisation** GitHub Actions workflow runs only via **Run workflow**
(`workflow_dispatch`). It queries TERMDAT on LINDAS production and opens or updates
a PR changing only `apis/core/bootstrap/organizations.ts`. It has no scheduled,
push or pull-request trigger. Existing workflows are unchanged. No LINDAS
credentials or new dependencies are needed.

After the workflow is merged into the default branch, open **Actions → Propose
organisation → Run workflow**. Select the branch to test; the workflow checks out
that branch and opens the organisation PR **against that same branch**. Normally,
select the default branch for a production proposal.
Supply these inputs:

| Input | Required | Example / default |
| --- | --- | --- |
| `termdat_id` | Yes | `3076` (BAG/FOPH) |
| `namespace` | Yes | `https://health.ld.admin.ch/foph/` |
| `publish_graph` | Yes | `https://lindas.admin.ch/foph/cube` |
| `observed_by` | Yes | `https://ld.admin.ch/office/II.1.6` |

The profile ID comes from the last namespace path segment (`foph` in this example),
which must use lowercase letters, digits and hyphens. The public service base is
the namespace origin (`https://health.ld.admin.ch`). Neither needs a separate input.

`observed_by` must identify the organisation, not its TERMDAT concept. It is an
explicit operator choice: the generator validates URL syntax but does not infer or
verify the organisation identity. Publishing settings must already be agreed.
The service base generates `/sparql`, `/query` and `/.well-known/void` URLs using
the same convention as existing profiles.

The SPARQL `CONSTRUCT` query builds the complete profile from a validated,
non-deprecated TERMDAT Name entry and the supplied publishing settings, including
available German, French, Italian, English and Romansh names. LINDAS serializes
the triples as N-Triples; the script wraps them in the organisation's named graph
and appends them to the TypeScript template. No RDF parsing or literal serialization
is needed in JavaScript. Duplicate profile IDs, namespaces, publishing graphs and
observer IRIs are rejected. Re-running before merge
regenerates the same `propose-organization/<selected_branch>/<profile_id>` PR;
re-running after merge fails with the duplicate profile message.

GitHub requires the new manual workflow to be merged into the default branch
before its **Run workflow** button is available. The local generator can be tested
before merging, using the command below. Once merged, the equivalent CLI command
for creating a proposal is:

```bash
gh workflow run propose-organization.yaml --repo SwissFederalArchives/lindas-cube-creator \
  --ref master \
  -f termdat_id=3076 \
  -f namespace=https://health.ld.admin.ch/foph/ \
  -f publish_graph=https://lindas.admin.ch/foph/cube \
  -f observed_by=https://ld.admin.ch/office/II.1.6
```

Watch the resulting run under **Actions → Propose organisation**. It should create
a PR from `propose-organization/master/foph` into `master`, containing only the new
organisation block. The selected branch is part of the proposal branch name so
testing cannot update a proposal against a different base branch.

Enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions
to create and approve pull requests**. The workflow uses the built-in
`GITHUB_TOKEN` with `contents: write` and `pull-requests: write`. Reviewers may need
to approve CI runs on bot-created PRs, depending on GitHub policy.

The PR links the source entry and contains the generated profile. Review its
translations and publishing settings before merging. Graph permissions, public
routing and deployment of the bootstrap configuration remain separate operations.

To test locally without modifying the real profiles:

```sh
node --test tools/propose-organization.test.mjs
cp apis/core/bootstrap/organizations.ts /tmp/proposed-organizations.ts
TERMDAT_ID=3076 \
NAMESPACE=https://health.ld.admin.ch/foph/ \
PUBLISH_GRAPH=https://lindas.admin.ch/foph/cube \
OBSERVED_BY=https://ld.admin.ch/office/II.1.6 \
node tools/propose-organization.mjs /tmp/proposed-organizations.ts
```

The local run also writes the PR description to
`${RUNNER_TEMP:-/tmp}/organization-proposal.md`.
