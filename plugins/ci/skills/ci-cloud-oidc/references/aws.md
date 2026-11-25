# AWS: one role per environment

The roles the release workflow of `ci-github-actions` (references/workflows.md § 2) assumes, in
Terraform. What was checked:

- `terraform fmt` and `terraform validate` pass with the AWS provider 6.74.
- A plan with stub credentials creates the provider and the two roles, and renders the policies
  below. It ran with a literal provider ARN, since the real one is known only after apply.
- Nothing was applied to an AWS account.

```hcl
# The roles a release job assumes with GitHub's OIDC token, so the job holds no AWS key. One role per
# target: each trusts only jobs in its own GitHub environment, and may write only its own folder, so
# a dev run can never write what prod's readers fetch.

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

variable "github_repository" {
  description = "owner/name of the repository whose release workflow assumes the roles"
  type        = string
}

variable "release_bucket" {
  description = "The bucket the release workflow publishes to"
  type        = string
}

variable "release_folders" {
  description = "Each target's GitHub environment and the bucket folder it alone may write"
  type        = map(string)
  default = {
    "release-dev"  = "app/dev"
    "release-prod" = "app/prod"
  }
}

variable "create_github_provider" {
  description = "Whether this configuration creates the account's GitHub OIDC provider, which exists once per account"
  type        = bool
  default     = true
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  count = var.create_github_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github_actions" {
  count = var.create_github_provider ? 0 : 1

  url = "https://token.actions.githubusercontent.com"
}

locals {
  github_provider_arn = (
    var.create_github_provider
    ? aws_iam_openid_connect_provider.github_actions[0].arn
    : data.aws_iam_openid_connect_provider.github_actions[0].arn
  )
}

data "aws_iam_policy_document" "release_trust" {
  for_each = var.release_folders

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # the environment, not a branch: the environment's own rule decides which branches reach it
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:${each.key}"]
    }
  }
}

resource "aws_iam_role" "release" {
  for_each = var.release_folders

  name                 = each.key
  assume_role_policy   = data.aws_iam_policy_document.release_trust[each.key].json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "release_write" {
  for_each = var.release_folders

  # write only: no read, list, or delete; PutObject also overwrites the manifest
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:AbortMultipartUpload"]
    resources = ["arn:aws:s3:::${var.release_bucket}/${each.value}/*"]
  }
}

resource "aws_iam_role_policy" "release_write" {
  for_each = var.release_folders

  name   = "release-write"
  role   = aws_iam_role.release[each.key].id
  policy = data.aws_iam_policy_document.release_write[each.key].json
}

output "role_arns" {
  description = "Each environment's role, for its RELEASE_AWS_ROLE_ARN"
  value       = { for environment, role in aws_iam_role.release : environment => role.arn }
}
```

What the plan rendered, for `github_repository = "owner/repo"` and
`release_bucket = "releases-example"`:

```text
aws_iam_role.release["release-dev"]   max_session_duration 3600
  trust: StringEquals token.actions.githubusercontent.com:aud = sts.amazonaws.com
         StringEquals token.actions.githubusercontent.com:sub = repo:owner/repo:environment:release-dev
aws_iam_role.release["release-prod"]  max_session_duration 3600
  trust: StringEquals …:sub = repo:owner/repo:environment:release-prod
aws_iam_role_policy.release_write["release-dev"]
  write: s3:PutObject, s3:AbortMultipartUpload on arn:aws:s3:::releases-example/app/dev/*
aws_iam_role_policy.release_write["release-prod"]
  write: s3:PutObject, s3:AbortMultipartUpload on arn:aws:s3:::releases-example/app/prod/*
```

- **The provider exists once per account.** A second configuration that needs it sets
  `create_github_provider = false` and reads it; two configurations that both create it fail on the
  second apply.
- **The environment is the subject.** A job without `environment:` presents
  `repo:owner/repo:ref:refs/heads/<branch>` and is refused, so a workflow on any branch that omits
  it never gets the role.
- **`AbortMultipartUpload`** lets `aws s3 cp` clean up a large upload it cut short; `PutObject`
  covers the parts and the overwrite of `release.json`.
- **The bucket's own policy** decides who reads: a public release folder allows `s3:GetObject` on
  its prefix to everyone and lists nothing, so a missing manifest answers 403, which the version
  gate reads as nothing published only on a first release (`ci-github-actions` § Releases). A bucket
  name with dots fails TLS at `<bucket>.s3.<region>.amazonaws.com`; readers then go through a CDN's
  host.
- **The role's output** goes into each environment's `RELEASE_AWS_ROLE_ARN`.

## Porting

- **CloudFormation or CDK**: the same three parts, the provider, a role per environment with the two
  `StringEquals` conditions, and an inline write policy.
- **A deploy that is not an upload** (a Lambda, an ECS service): the role gets that service's update
  actions on the one resource, never a managed `FullAccess` policy.
- **A reusable workflow in another repository** runs under its caller's subject; to trust only that
  workflow, customize the repository's subject template to include `job_workflow_ref`, and match the
  longer subject.
