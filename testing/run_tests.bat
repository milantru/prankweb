@echo off
setlocal enabledelayedexpansion

REM Exit on error
if "%1" == "clean" (
    echo Cleanup started

    echo Removing venv...
    rmdir /s /q venv

    echo Removing __pycache__ folders...
    for /r %%d in (__pycache__) do (
        if exist "%%d" rmdir /s /q "%%d"
    )

    echo Removing .pytest_cache...
    rmdir /s /q .pytest_cache

    echo Cleanup complete.
    exit /b
)

REM Create venv if not exists and install dependencies
if not exist "venv" (
    echo Creating venv...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -q requests biopython jsonschema pytest
) else (
    call venv\Scripts\activate.bat
)

REM Map argument to test function name
set "arg=%1"
set "test_name="

if "%arg%" == "upload-data" set "test_name=test_plankweb_upload_data"
if "%arg%" == "get-id" set "test_name=test_plankweb_get_id"
if "%arg%" == "ds-results" set "test_name=test_plankweb_ds_results"
if "%arg%" == "conservation-results" set "test_name=test_plankweb_conservation_results"
if "%arg%" == "inputs" set "test_name=test_plankweb_inputs"

if not "%arg%" == "" (
    if "%test_name%" == "" (
        echo Unknown test: %arg%
        echo Available tests: upload-data, get-id, ds-results, conservation-results, inputs
        exit /b 1
    )
    pytest -v plankweb-tests.py -k %test_name%
) else (
    pytest -v plankweb-tests.py
)
