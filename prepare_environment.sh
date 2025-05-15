#!/bin/bash

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script as root (use sudo)." >&2
  exit 1
fi

if [[ -z $1 ]]; then
  echo "Usage: $0 <path-to-mounted-storage>" >&2
  exit 1
fi

pushd deployment/scripts
./docker_setup.sh
./create_volumes.sh $1
./external_nginx_setup.sh
popd

