#!/bin/bash
set -e

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script as root (use sudo)." >&2
  exit 1
fi

if [[ -z $1 ]]; then 
  echo "Usage: $0 <path-to-mounted-storage>" >&2
  exit 1
fi

PLANKWEB_VOLUMES_PATH="$1/plankweb_volumes"
mkdir -p "$PLANKWEB_VOLUMES_PATH"

volumes=(
    rabbitmq
    redis
    celery
    foldseek
    p2rank
    plank
    inputs
    conservation
    grafana
    tmp
)

for volume in "${volumes[@]}";
do
    VOLUME_PATH="$PLANKWEB_VOLUMES_PATH/$volume"
    mkdir -p "$VOLUME_PATH"

    if docker volume inspect "plankweb_$volume" &>/dev/null; then
        echo ">>> Volume plankweb_$volume already exists. Skipping."
        continue
    fi

    docker volume create \
    --driver local \
    --opt type=none \
    --opt device="$VOLUME_PATH" \
    --opt o=bind \
    "plankweb_$volume"

    echo ">>> Created volume: plankweb_$volume -> $VOLUME_PATH"
done
