@echo off
REM Exit on any error
SETLOCAL ENABLEEXTENSIONS
SETLOCAL ENABLEDELAYEDEXPANSION

python -m venv venv

CALL venv\Scripts\activate.bat

pip install -q requests pytest

pytest -v plankweb-tests.py
