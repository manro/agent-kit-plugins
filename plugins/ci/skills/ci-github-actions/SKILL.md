---
name: ci-github-actions
description: >-
  GitHub Actions standard: least-privilege permissions, pinned actions, event data kept out of
  scripts, environments that hold secrets, a cheap gate before costly jobs, one build that ships,
  and releases run by hand as dry runs. Use when writing or reviewing a GitHub Actions workflow.
---

# GitHub Actions

A workflow is code that runs with the repository's secrets and its cloud access, so it is held to
the same review as the code it ships, and its own mistakes are the ones that leak. These rules come
from workflows in production use; [references/workflows.md](references/workflows.md) holds a check
workflow and a release by hand, checked as stated there. A workflow that reaches a cloud follows
`ci-cloud-oidc` for its access, and a step that writes to a live system follows `code-ops-commands`
where the repository has it.

## When to use

**MUST** apply when writing, changing, reviewing, or planning a workflow, a reusable workflow, or a
composite action under `.github/`.

## Repository facts

- **Its workflows, their triggers, and which checks branch rules require**, from `.github/` and the
  repository's settings.
- **Its environments**: their names, branch rules, reviewers, variables, and secrets.
- **Its package manager and runners**, from the lockfile and the existing workflows.
- **What each workflow publishes or deploys, and where**: a bucket, a store, a registry.

## Triggers

- **Checks run on `pull_request` and on pushes to the default branch.** A required check on the
  default branch's rule keeps a failing change out.
- **A release runs by hand** (`workflow_dispatch`) with typed inputs: a `choice` for the target and
  a `boolean` dry run that defaults to true. A release on a push to the default branch has its gate
  output `skip` for a version already published, and the later jobs run `if:` it is not set, so a
  merge without a version bump ends green and publishes nothing.
- **Never `pull_request_target` or `workflow_run` with the pull request's code.** Both run with the
  base repository's secrets and a write token; checking out the head there runs a stranger's code
  with them. Use them only for work that never runs the pull request's files (labels, comments).
- **Path filters list the workflow's own file**, so a change to the workflow runs it.

## Permissions and tokens

- **`permissions: {}` at the top; each job asks for what it uses**: `contents: read` to check out, a
  write permission only on the job that writes. A called workflow gets no more than its caller's job
  grants.
- **`id-token: write` only on a job that installs and builds nothing.** Every step of that job can
  ask for the OIDC token, a package's install script included, so the job that builds uploads an
  artifact and a separate job signs in and publishes it (`ci-cloud-oidc`).
- **Checkout keeps no credentials** (`persist-credentials: false`) unless the job pushes, so no
  later step, an action or a package's install script, can use the token.

## Actions

- **Every action is pinned to a full commit SHA, the tag in a comment**
  (`actions/checkout@3d3c42e… # v7.0.1`), since a tag can move. First-party actions too.
- **Dependabot keeps the pins current** (`package-ecosystem: github-actions`): it moves the SHA and
  the comment together, in a pull request the checks run on.
- **An action that holds a credential** (cloud sign-in, publishing) is pinned before any other, and
  reviewed when it moves.

## Event data is input

- **No `${{ }}` of outside data inside `run:`.** A pull request's title, body, or branch name, a
  comment, a commit message, and a string input are text anyone can choose; inlined into a script, a
  quote ends the string and the rest runs. They reach the shell through `env:`, quoted (`"$TITLE"`).
- **`${{ }}` stays for values the workflow owns**: `inputs` of a `choice` or `boolean` type,
  `needs.*.outputs`, `vars`, and step outputs the workflow wrote.

## Secrets and environments

- **One environment per target** (`release-dev`, `release-prod`). It holds that target's secrets and
  variables, its deployment branch rule, and, for production, required reviewers. Nothing that
  publishes sits at repository level.
- **Identifiers are variables, secrets are secrets**: a role ARN, a key id, a bucket path are
  variables; a certificate, a password, or a private key is a secret.
- **A secret reaches only the step that uses it**, through that step's `env:`, after the install and
  the build have run their scripts. A file that holds one goes to `$RUNNER_TEMP`. Nothing prints
  one; a value derived from one is masked first (`::add-mask::`).
- **An environment that holds a shared identity limits its branches as tightly as production's.** A
  signing certificate or a publisher's account is one identity, whichever target's environment holds
  it, so a branch anyone can push never reaches it.
- **A cloud is reached with the run's OIDC token, never a stored key** (`ci-cloud-oidc`).

## Jobs

- **Cheap first.** The checks that can refuse a run (settings, branch, version) run first, on the
  cheapest runner, before the install; a macOS or GPU runner starts only after they pass.
- **Every job has `timeout-minutes`**, set from its usual time with room, so a hung step cannot hold
  a runner for six hours.
- **A missing setting fails in seconds, naming it**:
  `::error::set the variable RELEASE_AWS_ROLE_ARN in this environment`.
- **Concurrency is per target**: a pull request's run is cancelled by its next push; a publish is
  never cancelled midway (`cancel-in-progress: false`), and a second run waits, then finds its
  version published and stops.
- **Installs follow the lockfile** (`npm ci`, `pnpm install --frozen-lockfile`).
- **A workflow that builds what ships restores no cache.** Code that runs in the default branch's
  context (a `pull_request_target` mistake, an injected script) can write a cache that a later
  restore trusts, and a lockfile check does not catch a package store replaced whole. Checks on a
  pull request may cache; a release, and any job that holds a secret, installs from the registry.
- **Build once, publish what was checked.** The job that runs the checks builds and uploads the
  artifact; a publish job downloads that artifact and never builds. A reusable workflow
  (`workflow_call`) holds the build when two release workflows share it.
- **Logic longer than a few lines is a script in the repository**, with its own tests, run by the
  step; the workflow wires inputs to it.

## Releases

- **A version gate reads what the target has published** and refuses the same or an older version. A
  404 is nothing published. A 403 is nothing published only on a first release the run is told of (a
  `first_release` input): a bucket that may not be listed answers 403 for a missing manifest, but so
  does every manifest once its reads break, which would let any version out. Any other answer that
  cannot be read stops the run, so a network error never lets an old version out.
- **A dry run does everything but publish.** It builds, signs, and signs in to the cloud, which
  proves the secrets and the trust, reports what a real run would refuse instead of stopping, and
  writes what it would publish to the step summary.
- **The pointer goes last, uncached.** Files first, then the manifest or feed that names them
  (`Cache-Control: no-store`), so a reader never sees a manifest that names a file not there yet.
- **A release says what it did**: a `::notice::` with the target and version, and the step summary.

## Testing a workflow

- **actionlint** checks expressions, contexts, and runner labels, and **ShellCheck** each `run:`
  block. Use a current actionlint: an older build flags the `vars` context and new runner labels.
- **A release's scripts run under test** with stub servers and fake CLIs on `PATH`: the version
  gate's every case, and the order of the publish.
- **The dry run is the rehearsal**: run it after any change to the release, before a real run.

## Review checklist

- `permissions: {}` at the top; each job's grants match what it does; checkout without credentials.
- Every action pinned to a SHA with its tag; Dependabot updates them.
- No outside data in `${{ }}` inside `run:`; no `pull_request_target` or `workflow_run` running the
  pull request's code.
- One environment per target, with its branch rule; secrets only there, only in the step that uses
  them; no stored cloud key.
- Cheap checks first; a timeout on every job; missing settings named; concurrency per target.
- One build, published as checked, with no cache restored; a version gate that reads 403 as nothing
  only on a first release; a dry run by default; the pointer last.
- `id-token: write` only on a job that installs and builds nothing.
- Scripts with tests; actionlint and ShellCheck clean.
