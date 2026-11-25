---
name: ci-cloud-oidc
description: >-
  Keyless cloud access from CI: GitHub's OIDC token traded for short-lived AWS role or Google Cloud
  credentials, trusted only from one repository's environment and allowed one folder. Use when a
  workflow deploys or publishes to AWS or GCP, or when writing the roles it assumes.
---

# Cloud Access from CI by OIDC

A workflow proves who it is with a token GitHub signs for each job, and the cloud trades it for
credentials that last an hour. No key is stored, so none leaks or needs rotating, and the cloud's
log names the repository and environment behind every call. The trust and the permissions live in
the repository's infrastructure code, reviewed like any other change.
[references/aws.md](references/aws.md) holds the AWS roles in Terraform and
[references/gcp.md](references/gcp.md) the Google Cloud setup, each with the workflow step that uses
it and what was checked. The workflows around them follow `ci-github-actions`.

## When to use

**MUST** apply when a workflow reaches AWS or Google Cloud, when writing or reviewing the roles,
providers, or grants it uses, or when replacing a stored cloud key in CI.

## Repository facts

- **Its clouds, accounts, and projects**, and **its infrastructure tool** (Terraform, CDK, `gcloud`
  scripts), from the repository.
- **Its GitHub environments**, one per target, and what each target writes.
- **Whether the account already trusts GitHub's issuer**: an AWS account holds one OIDC provider for
  it, shared by every role.

## The token

- **A job gets one with `id-token: write`.** Its claims say where the run came from: `repository`,
  `ref`, `workflow_ref`, `event_name`, `environment` when the job names one, and `sub`, which
  combines them: `repo:<owner>/<repo>:environment:<name>` for a job in an environment, else
  `repo:<owner>/<repo>:ref:refs/heads/<branch>` or `…:pull_request`. The audience (`aud`) names the
  cloud that should accept it.
- **Trust the environment's subject, not a branch's.** The environment's branch rule and reviewers
  decide which runs reach it, in one place GitHub enforces; a job that names no environment gets a
  different subject and is refused.
- **Credentials last an hour at most**, enough for one job; a longer job signs in again.

## Trust

- **One identity per target**, trusted by that target's environment only, so dev's identity can
  never write what prod's readers fetch.
- **Match exactly.** The subject and the audience are compared for equality: a wildcard on the
  repository (`repo:owner/*`) or the subject (`repo:owner/repo:*`) admits every branch and every
  pull request.
- **Every grant names the repository**, since every repository on GitHub shares the issuer. An AWS
  role's subject names it; a Google provider's attribute condition admits only it.

## Permissions

- **Write only what the job writes**: put objects under the target's folder, and nothing to read,
  list, or delete unless the job needs it. Google Cloud Storage needs delete to overwrite an object,
  so its role is `roles/storage.objectUser` under a condition on the folder; S3's `PutObject`
  overwrites alone.
- **`gcloud storage cp` lists the bucket before it writes**, and Cloud Storage checks a list on the
  bucket, never on a folder, so the folder's condition can never allow it. The identity also holds a
  custom role with `storage.objects.list` alone on the whole bucket, unconditioned: it sees the
  objects' names, never their contents. Without it the upload fails before writing anything, and a
  dry run, which never uploads, does not show it.
- **A missing object reads as 403 where listing is denied**, and so does every object once reads
  break. A job that reads what it published first (a version gate) takes 404 as nothing published,
  and 403 only on a first release it is told of.
- **One more API is one more grant on the same identity**, never a broader role.

## In the workflow

- **`id-token: write` only on a job that installs and builds nothing.** Every step of a job with it
  can ask GitHub for the token (`ACTIONS_ID_TOKEN_REQUEST_URL` and `…_TOKEN` are in its
  environment), so a package's install script there could take the role, whenever the sign-in step
  runs. The job that builds uploads an artifact; a job that only downloads it signs in and
  publishes. A dry run signs in too, which proves the trust.
- **The sign-in actions are pinned to a commit** (`ci-github-actions` § Actions), like every action.
- **The identity's name is a variable of the environment** (`RELEASE_AWS_ROLE_ARN`, the provider's
  resource name), not a secret: knowing it grants nothing.

## AWS

- **The account trusts GitHub's issuer once**: an OIDC provider for
  `https://token.actions.githubusercontent.com` with the audience `sts.amazonaws.com`.
- **Each role's trust policy** allows `sts:AssumeRoleWithWebIdentity` from that provider with
  `StringEquals` on `token.actions.githubusercontent.com:aud` and on `…:sub`, the environment's
  subject, and its session lasts an hour.
- **`aws-actions/configure-aws-credentials`** assumes it with `role-to-assume` and `aws-region`; the
  steps after it use the credentials through the usual environment.

## Google Cloud

- **A workload identity pool with a GitHub provider** maps `google.subject` from `assertion.sub`,
  keeps the repository and environment as attributes, and admits only this repository through its
  attribute condition. A deleted pool or provider holds its name for 30 days: a setup script
  restores it rather than creating it again.
- **Grant the run's own principal** (`principal://…/subject/repo:<owner>/<repo>:environment:<name>`)
  the resource's role, with no service account and no key. Impersonate a service account only for an
  API that takes nothing but a service account's token.
- **`google-github-actions/auth`** signs in with `workload_identity_provider` alone; `setup-gcloud`
  then runs `gcloud` with those credentials.

## Review checklist

- No stored cloud key in the repository's or any environment's secrets.
- `id-token: write` only on the job that signs in, which names its environment and installs and
  builds nothing.
- One identity per target, trusted from that environment's subject only, matched exactly, the
  audience checked.
- Write-only grants on the target's folder, and on Cloud Storage the bucket-wide list a `gcloud`
  upload needs; the overwrite and 403 cases handled.
- The sign-in pinned; the dry run signs in.
- The trust and the grants in infrastructure code, applied from review.
