# Proposing an organisation

The **Propose organisation** GitHub Actions workflow runs only via **Run workflow**
(`workflow_dispatch`). It queries TERMDAT on LINDAS production and opens or updates
a PR changing only `apis/core/bootstrap/organizations.ts`. It has no scheduled,
push or pull-request trigger. No LINDAS credentials or new dependencies are needed.

After the workflow is merged into the default branch, open **Actions → Propose
organisation → Run workflow**. The workflow always checks out the default branch.
Supply these inputs:

| Input | Required | Example / default |
| --- | --- | --- |
| `termdat_id` | Yes | `3076` (BAG/FOPH) |
| `namespace` | Yes | `https://health.ld.admin.ch/foph/` |
| `publish_graph` | Yes | `https://lindas.admin.ch/foph/cube` |
| `observed_by` | Yes | `https://ld.admin.ch/office/II.1.6` |
| `profile_id` | No | Lowercase English abbreviation from TERMDAT, e.g. `foph` |
| `service_base` | No | Namespace origin, e.g. `https://health.ld.admin.ch` |

`observed_by` must identify the organisation, not its TERMDAT concept. It is an
explicit operator choice: the generator validates URL syntax but does not infer or
verify the organisation identity. Publishing settings must already be agreed.
The service base generates `/sparql`, `/query` and `/.well-known/void` URLs using
the same convention as existing profiles.

The generator requires a validated, non-deprecated TERMDAT Name entry. It copies
available German, French, Italian, English and Romansh names and reports missing
languages in the PR. It rejects ambiguous names and duplicate profile IDs,
namespaces, publishing graphs or observer IRIs. If an English abbreviation cannot
provide a valid profile ID, supply `profile_id` explicitly. Re-running before merge
regenerates the same `propose-organization/<profile_id>` PR from the default branch;
re-running after merge fails with the duplicate profile message.

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
