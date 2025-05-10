#!/bin/bash

# Exit on any error
set -e

python3 -m venv venv

source venv/bin/activate

pip install -q requests jsonschema pytest

pytest -v plankweb-tests.py
