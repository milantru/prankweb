#!/bin/sh
set -eu

pip install --root-user-action=ignore --no-cache-dir pip-tools
pip-compile requirements.in
pip install --root-user-action=ignore --no-cache-dir -r requirements.txt
pip uninstall --root-user-action=ignore -y pip-tools