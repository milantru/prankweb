#!/bin/bash

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script as root (use sudo)." >&2
  exit 1
fi

# build and run docker application
pushd src
docker compose -f docker-compose-plankweb.yml up -d
popd

# restart nginx server
systemctl nginx restart
