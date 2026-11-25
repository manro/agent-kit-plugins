# Google Cloud: direct workload identity federation

The Google Cloud side of the release workflow of `ci-github-actions` (references/workflows.md § 2),
published to Cloud Storage: a pool and a GitHub provider, and each target environment's own
principal granted its folder, with no service account and no key. What was checked:

- The setup script passes ShellCheck 0.11 and `bash -n`, and every `gcloud` command and flag it uses
  was found in the installed `gcloud`'s help.
- The workflow passes the same lint as the S3 release, and `publish-gcs.sh` its tests with a fake
  `gcloud`.
- `publish-gcs.sh` ran against a fake Cloud Storage endpoint with gcloud 589. With object lists
  refused, `gcloud storage cp` exited 1 having written nothing: it lists `prefix=app/dev` before its
  first upload. With lists allowed, and the bucket and its storage layout still refused, it uploaded
  `app/dev/assets/app.js`, then `app/dev/release.json`.
- Nothing was run against a Google Cloud project: the IAM side rests on Cloud Storage's
  documentation, that a list is checked on the bucket.

```bash
#!/usr/bin/env bash
# Creates, or brings back in line, the Google Cloud side of keyless releases: a workload identity
# pool and a GitHub provider that admits only this repository, and for each target environment a
# bucket role on its own folder, held by that environment's principal itself, with no service
# account and no key. Idempotent: a re-run keeps what exists, restores what was soft-deleted, and
# applies a changed provider condition. A grant this script no longer makes stays until it is
# removed with `gcloud storage buckets remove-iam-policy-binding`.
set -euo pipefail

PROJECT=example-releases
POOL=github-actions
PROVIDER=github
REPO=owner/repo
BUCKET=releases-example
LISTER_ROLE=releaseObjectLister
# each target's GitHub environment and the bucket folder it alone may write
TARGET_LIST=("release-dev:app/dev" "release-prod:app/prod")

ISSUER=https://token.actions.githubusercontent.com
MAPPING=google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment
# Every repository's tokens share GitHub's issuer, so the provider admits this repository only, by
# name; each grant below then narrows to one environment's subject.
CONDITION="assertion.repository == '${REPO}'"

POOL_FLAGS=(--project="$PROJECT" --location=global)
PROVIDER_FLAGS=("${POOL_FLAGS[@]}" --workload-identity-pool="$POOL")

log() { printf '• %s\n' "$*"; }

if [ -z "$(gcloud auth list --filter=status:ACTIVE --format='value(account)')" ]; then
  echo "No active gcloud account: run gcloud auth login" >&2
  exit 1
fi

project_number=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')

log "enabling the token exchange APIs"
gcloud services enable sts.googleapis.com iamcredentials.googleapis.com \
  --project="$PROJECT" --quiet

# a deleted pool or provider is kept for 30 days and blocks its name, so it is restored, not created
pool_state=$(gcloud iam workload-identity-pools describe "$POOL" "${POOL_FLAGS[@]}" \
  --format='value(state)' 2> /dev/null || true)
case "$pool_state" in
  "")
    log "creating pool $POOL"
    gcloud iam workload-identity-pools create "$POOL" "${POOL_FLAGS[@]}" --quiet \
      --display-name="GitHub Actions"
    ;;
  DELETED)
    log "pool $POOL is soft-deleted: restoring"
    gcloud iam workload-identity-pools undelete "$POOL" "${POOL_FLAGS[@]}" --quiet
    ;;
  *) log "pool $POOL exists" ;;
esac

provider_state=$(gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  "${PROVIDER_FLAGS[@]}" --format='value(state)' 2> /dev/null || true)
case "$provider_state" in
  "")
    log "creating provider $PROVIDER"
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" "${PROVIDER_FLAGS[@]}" \
      --quiet --display-name="GitHub" --issuer-uri="$ISSUER" \
      --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION"
    ;;
  *)
    if [ "$provider_state" = DELETED ]; then
      log "provider $PROVIDER is soft-deleted: restoring"
      gcloud iam workload-identity-pools providers undelete "$PROVIDER" "${PROVIDER_FLAGS[@]}" --quiet
    fi
    log "updating provider $PROVIDER to the issuer, mapping, and condition above"
    gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" "${PROVIDER_FLAGS[@]}" \
      --quiet --issuer-uri="$ISSUER" --attribute-mapping="$MAPPING" \
      --attribute-condition="$CONDITION"
    ;;
esac

# gcloud storage cp lists the bucket before it writes, and a list is checked on the bucket, never on
# a folder, so each principal also lists the whole bucket: the objects' names, never their contents
lister_state=$(gcloud iam roles describe "$LISTER_ROLE" --project="$PROJECT" \
  --format='value(deleted)' 2> /dev/null || echo missing)
case "$lister_state" in
  missing)
    log "creating role $LISTER_ROLE"
    gcloud iam roles create "$LISTER_ROLE" --project="$PROJECT" --quiet \
      --title="Release object lister" --permissions=storage.objects.list --stage=GA
    ;;
  True)
    log "role $LISTER_ROLE is deleted: restoring"
    gcloud iam roles undelete "$LISTER_ROLE" --project="$PROJECT" --quiet
    ;;
  *) log "role $LISTER_ROLE exists" ;;
esac

pool_path="projects/${project_number}/locations/global/workloadIdentityPools/${POOL}"

for target in "${TARGET_LIST[@]}"; do
  environment=${target%%:*}
  folder=${target#*:}
  principal="principal://iam.googleapis.com/${pool_path}/subject/repo:${REPO}:environment:${environment}"

  # objectUser, since overwriting an object (the manifest) also needs storage.objects.delete
  log "granting $environment the objects under gs://$BUCKET/$folder/"
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --quiet \
    --member="$principal" --role=roles/storage.objectUser \
    --condition="title=${environment},expression=resource.name.startsWith('projects/_/buckets/${BUCKET}/objects/${folder}/')" \
    > /dev/null

  log "granting $environment the bucket's object names"
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --quiet \
    --member="$principal" --role="projects/${PROJECT}/roles/${LISTER_ROLE}" --condition=None \
    > /dev/null
done

cat << EOF

Done. Each release environment's variables:
  RELEASE_GCP_WORKLOAD_IDENTITY_PROVIDER: ${pool_path}/providers/${PROVIDER}
  RELEASE_GCS_FOLDER:                      gs://${BUCKET}/<its folder>
EOF
```

- **The provider admits this repository only.** Every repository on GitHub shares the issuer; a
  provider without the attribute condition would admit tokens from all of them.
- **Each grant names one environment's subject**, so `release-dev` can write only `app/dev/`.
- **`roles/storage.objectUser`**: overwriting `release.json` needs `storage.objects.delete`, which
  `objectCreator` lacks.
- **`releaseObjectLister`, unconditioned**: `gcloud storage cp` lists the bucket before it writes,
  and a list is checked on the bucket, which a folder's condition never matches. The role holds
  `storage.objects.list` alone, so each principal sees every object's name and no object's contents.
  Without it the upload fails, and a dry run, which never uploads, still passes.
- **A re-run** applies a changed provider condition, but a grant on a folder it no longer names
  stays until `gcloud storage buckets remove-iam-policy-binding` removes it.
- **The bucket uses uniform bucket-level access**, which IAM conditions on a bucket require.
- **A service account, impersonated**, replaces the direct grant only for an API that takes nothing
  but a service account's token: grant `roles/iam.workloadIdentityUser` on it to the same principal,
  and pass `service_account` to the auth action.
- **A tighter provider** also checks the workflow and the event in its condition
  (`assertion.workflow_ref.startsWith('<owner>/<repo>/.github/workflows/release.yml@')`,
  `assertion.event_name == 'workflow_dispatch'`), so only that workflow, run by hand, gets a token.

The workflow differs from the S3 release in its publish job only.

````yaml
name: Release (Cloud Storage)

# The same release as release.yml, published to Cloud Storage: the target's environment names its
# workload identity provider and folder, and the run's own identity holds the bucket role, with no
# service account and no key.
on:
  workflow_dispatch:
    inputs:
      target:
        description: Where to publish
        type: choice
        options: [dev, prod]
        default: dev
      dry_run:
        description: "Dry run: build and sign in, publish nothing"
        type: boolean
        default: true
      first_release:
        description: "The target's first release: read a 403 from its manifest as nothing published"
        type: boolean
        default: false

concurrency:
  group: release-gcs-${{ inputs.target }}
  cancel-in-progress: false

permissions: {}

jobs:
  build:
    permissions:
      contents: read
    uses: ./.github/workflows/release-build.yml
    with:
      target: ${{ inputs.target }}
      dry_run: ${{ inputs.dry_run }}
      first_release: ${{ inputs.first_release }}

  publish:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: release-${{ inputs.target }}
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Check the environment's variables
        env:
          PROVIDER: ${{ vars.RELEASE_GCP_WORKLOAD_IDENTITY_PROVIDER }}
          FOLDER: ${{ vars.RELEASE_GCS_FOLDER }}
        run: |
          need() { test -n "$1" || { echo "::error::set the variable $2 in this environment"; exit 1; }; }
          need "$PROVIDER" RELEASE_GCP_WORKLOAD_IDENTITY_PROVIDER
          need "$FOLDER" RELEASE_GCS_FOLDER
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
          sparse-checkout: scripts/release
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: release-build
          path: dist
      # direct workload identity federation: no service_account, so the run's own principal
      # (its repository and environment) holds the bucket role
      - uses: google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093 # v3
        with:
          workload_identity_provider: ${{ vars.RELEASE_GCP_WORKLOAD_IDENTITY_PROVIDER }}
      - uses: google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db # v3.0.1
      - name: Dry run (nothing published)
        if: inputs.dry_run
        env:
          FOLDER: ${{ vars.RELEASE_GCS_FOLDER }}
          VERSION: ${{ needs.build.outputs.version }}
        run: |
          {
            echo "### Dry run: nothing published"
            echo "would publish $VERSION to \`$FOLDER\`:"
            echo '```'
            find dist -type f | sort
            echo '```'
          } >> "$GITHUB_STEP_SUMMARY"
      - name: Publish
        if: ${{ !inputs.dry_run }}
        env:
          FOLDER: ${{ vars.RELEASE_GCS_FOLDER }}
          VERSION: ${{ needs.build.outputs.version }}
        run: |
          scripts/release/publish-gcs.sh dist "$FOLDER"
          echo "::notice::published $VERSION to $FOLDER"
````

```bash
#!/usr/bin/env bash
# Publishes a build folder to its target's folder on Cloud Storage: every file but the manifest
# first, then the manifest, never cached, so a reader never sees a manifest that names a file not
# there yet. Usage: publish-gcs.sh <build-folder> <gs://bucket/prefix/target>
set -euo pipefail

build_path=$1
folder=$2

test -f "$build_path/release.json" || {
  echo "::error::$build_path has no release.json"
  exit 1
}

# the manifest waits outside the folder while the rest is copied
manifest_path=$(mktemp -d)/release.json
mv "$build_path/release.json" "$manifest_path"

gcloud storage cp --recursive "$build_path/*" "$folder/"
gcloud storage cp "$manifest_path" "$folder/release.json" --cache-control=no-store
```

- **`gcloud storage cp` expands the quoted `*` itself**, and `--cache-control=no-store` sets the
  manifest's metadata as it is written.
- **The environment's variables**: `RELEASE_GCP_WORKLOAD_IDENTITY_PROVIDER`, the provider's full
  resource name the script prints, and `RELEASE_GCS_FOLDER`, `gs://<bucket>/<folder>`.

## Porting

- **Terraform**: `google_iam_workload_identity_pool`, `google_iam_workload_identity_pool_provider`
  with the same mapping and condition, and a `google_storage_bucket_iam_member` per environment with
  the folder's condition.
- **Another resource** (Cloud Run, Artifact Registry): the same principal gets that resource's role
  on the one resource, under the same subject.
