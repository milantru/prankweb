#!/bin/bash

# Exit on any error
set -e

# Cleanup
if [ "$1" == "clean" ]; then
    echo "Cleanup started"
    
    echo "Removing venv..."
    rm -rf venv
    
    echo "Removing __pycache__ folder..."
    rm -rf __pycache__
    
    echo "Removing .pytest_cache folder..."
    rm -rf .pytest_cache
    
    echo "Cleanup complete."
    exit 0
fi

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -q requests biopython jsonschema pytest
else 
    source venv/bin/activate
fi

# Run tests

declare -A TESTS=(
    ["upload-data"]="test_plankweb_upload_data"
    ["get-id"]="test_plankweb_get_id"
    ["ds-results"]="test_plankweb_ds_results"
    ["conservation-results"]="test_plankweb_conservation_results"
    ["inputs"]="test_plankweb_inputs"
)

if [ -n "$1" ]; then

    PYTEST_FUNCTION_NAME="${TESTS[$1]}"
    if [ -z "$PYTEST_FUNCTION_NAME" ]; then
        echo "Unknown test: $1"
        echo "Available tests: ${!TESTS[@]}"
        exit 1
    fi

    pytest -v plankweb-tests.py -k "$PYTEST_FUNCTION_NAME"
else
    pytest -v plankweb-tests.py
fi
