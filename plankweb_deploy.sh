#!/bin/bash

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script as root (use sudo)." >&2
  exit 1
fi

if [[ -z $1 || -z $2 ]]; then 
  echo "Usage: $0 <domain> <email>" >&2
  exit 1
fi

# build and run docker application
pushd src
docker compose -f docker-compose-plankweb.yml up -d
popd

pushd deployment/scripts
./external_nginx_setup.sh $1 $2
popd
