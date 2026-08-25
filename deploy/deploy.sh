#!/usr/bin/env bash
#
# Deploys a published image to the host this runs on.
#
#   ./deploy/deploy.sh prod 6415675429f5e7bb5511a2d6fde123ec6a3ab5f7
#   ./deploy/deploy.sh qa   6415675429f5e7bb5511a2d6fde123ec6a3ab5f7
#
# Invoked by .github/workflows over SSM, and safe to run by hand over SSH when
# something needs doing outside the pipeline.
#
# Why a script rather than a list of commands in a YAML block: the deploy has to
# roll back when the new image will not come up, and that decision needs the
# previous tag, a health poll and a timeout. Encoding it here keeps it reviewable
# and lets the same logic run from a terminal during an incident, when GitHub is
# not the tool you want to be reaching for.
#
# One tag drives both images. They were set independently before, and a web
# bundle newer or older than the API is the worst failure this deployment has:
# it does not look like a deploy problem at all. When the API began requiring a
# share authorization, the older bundle simply did not render its checkbox, and
# submitted cases were held at the routing gate and never reached an attorney,
# with no error on either side.

set -Eeuo pipefail

ENVIRONMENT="${1:-}"
TAG="${2:-}"

REGISTRY="${REGISTRY:-302524629649.dkr.ecr.us-east-1.amazonaws.com}"
AWS_REGION="${AWS_REGION:-us-east-1}"
# The API healthcheck has a 60s start_period, then 30s intervals with 3 retries,
# so an image that never becomes healthy takes ~150s to say so. 300 leaves room
# for a slow pull on a t3.medium without waiting through a second full cycle.
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"

COMPOSE_FILE="docker-compose.deploy.yml"

die() { echo "deploy: $*" >&2; exit 1; }
log() { echo "==> $*"; }

case "$ENVIRONMENT" in
  prod|qa) ;;
  *) die "usage: $0 <prod|qa> <tag>" ;;
esac
[ -n "$TAG" ] || die "usage: $0 <prod|qa> <tag>"

cd "$(dirname "$0")/.."
[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found in $(pwd)"

ENV_FILE=".env.${ENVIRONMENT}"
[ -f "$ENV_FILE" ] || die "$ENV_FILE not found. Copy ${ENV_FILE}.example and fill it in."

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

# Read back what is deployed now, so a failed rollout has somewhere to return to.
# Empty on a host that has only ever built locally, in which case there is no
# previous published image and rollback is skipped rather than guessed at.
current_tag() {
  local line
  line="$(grep -E '^API_IMAGE=' "$ENV_FILE" 2>/dev/null | tail -1 || true)"
  [ -n "$line" ] || return 0
  printf '%s' "${line##*:}"
}

set_tag() {
  local tag="$1" key value
  for key in API_IMAGE WEB_IMAGE; do
    case "$key" in
      API_IMAGE) value="${REGISTRY}/clearcaseiq-api:${tag}" ;;
      WEB_IMAGE) value="${REGISTRY}/clearcaseiq-web:${tag}" ;;
    esac
    # Delete then append, so repeated deploys cannot leave two definitions
    # behind - the later one wins in compose, which makes a stale duplicate
    # silently harmless until the day someone reorders the file.
    sed -i "/^${key}=/d" "$ENV_FILE"
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  done
}

container_state() {
  docker inspect -f '{{.State.Status}}' "clearcaseiq-${ENVIRONMENT}-$1" 2>/dev/null || echo missing
}

container_health() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
    "clearcaseiq-${ENVIRONMENT}-$1" 2>/dev/null || echo missing
}

wait_for_health() {
  local deadline=$(( $(date +%s) + HEALTH_TIMEOUT )) api web

  while [ "$(date +%s)" -lt "$deadline" ]; do
    api="$(container_health api)"
    web="$(container_health web)"

    [ "$api" = healthy ] && [ "$web" = healthy ] && return 0

    # The API entrypoint runs `prisma db push` and exits if it fails, so a schema
    # it cannot verify shows up as a stopped container rather than an unhealthy
    # one. Waiting out the full timeout for something already dead just delays
    # the rollback.
    for svc in api web; do
      if [ "$(container_state "$svc")" = exited ]; then
        log "$svc exited during rollout"
        return 1
      fi
    done

    sleep 5
  done

  log "timed out after ${HEALTH_TIMEOUT}s (api=$api web=$web)"
  return 1
}

PREVIOUS_TAG="$(current_tag)"

log "environment: $ENVIRONMENT"
log "deploying:   $TAG"
log "previous:    ${PREVIOUS_TAG:-<none recorded>}"

log "authenticating to ECR"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

set_tag "$TAG"

log "pulling images"
compose pull

log "starting"
compose up -d

log "waiting for both services to report healthy"
if wait_for_health; then
  log "deploy succeeded: $TAG"
  # Reclaims the disk the previous image held. This host has hit ENOSPC before,
  # back when it built in place, and untagged layers accumulate the same way.
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

echo "--- api logs (last 50) ---" >&2
compose logs --tail 50 api >&2 || true

if [ -z "$PREVIOUS_TAG" ] || [ "$PREVIOUS_TAG" = "$TAG" ]; then
  die "rollout failed and there is no previous tag to return to. The stack is down."
fi

log "rolling back to $PREVIOUS_TAG"
set_tag "$PREVIOUS_TAG"
compose up -d

if wait_for_health; then
  die "rollout of $TAG failed; rolled back to $PREVIOUS_TAG, which is healthy."
fi

die "rollout of $TAG failed AND rollback to $PREVIOUS_TAG did not come healthy. The stack is down and needs hands."
