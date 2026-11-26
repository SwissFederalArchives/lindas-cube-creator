# Proposing an organisation

The **Propose organisation** GitHub Actions workflow runs only via **Run workflow**
(`workflow_dispatch`). It queries TERMDAT on LINDAS production and opens or updates
a PR changing only `apis/core/bootstrap/organizations.ts`. It has no scheduled,
push or pull-request trigger. It also exposes a reusable entry point, guarded to
accept only manual dispatches. No LINDAS credentials or new dependencies are needed.

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

The generator requires a validated, non-deprecated TERMDAT Name entry. It copies
available German, French, Italian, English and Romansh names and reports missing
languages in the PR. It rejects ambiguous names and duplicate profile IDs,
namespaces, publishing graphs or observer IRIs. Re-running before merge
regenerates the same `propose-organization/<selected_branch>/<profile_id>` PR;
re-running after merge fails with the duplicate profile message.

## Testing before this workflow is merged

GitHub requires a new `workflow_dispatch` workflow to exist on the default branch
before it can be dispatched. The existing **CI** workflow therefore has a manual
`propose_organization` option that calls this workflow from the selected branch.
It skips the regular CI jobs in this mode. Pushes and PR events continue running
normal CI and never create an organisation proposal.

To test this PR's code, dispatch the already-registered CI workflow using GitHub
CLI (the branch version defines the new inputs):

```sh
gh workflow run ci.yaml --repo SwissFederalArchives/lindas-cube-creator \
  --ref feat/manual-organization-proposals \
  -f propose_organization=true \
  -f termdat_id=3076 \
  -f namespace=https://health.ld.admin.ch/foph/ \
  -f publish_graph=https://lindas.admin.ch/foph/cube \
  -f observed_by=https://ld.admin.ch/office/II.1.6
```

Watch the resulting run under **Actions → CI**. It should create a PR from
`propose-organization/feat/manual-organization-proposals/foph` into
`feat/manual-organization-proposals`, containing only the new organisation block.
This keeps the test addition out of the implementation PR until explicitly merged.
The branch is part of the proposal branch name so testing cannot update a proposal
against a different base branch.

Enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions
to create and approve pull requests**. The workflow uses the built-in
`GITHUB_TOKEN` with `contents: write` and `pull-requests: write`. Reviewers may need
to approve CI runs on bot-created PRs, depending on GitHub policy.

The PR includes the source entry, modification date, language coverage and chosen
publishing settings. Review these before merging. Graph permissions, public
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
