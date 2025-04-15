#!/bin/sh
set -eu

pip install --no-cache-dir pip-tools
pip-compile requirements.in
pip install --no-cache-dir -r requirements.txt
pip uninstall -y pip-tools