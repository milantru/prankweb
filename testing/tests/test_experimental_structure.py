import requests

import json
import pytest
import requests

API_URL = "http://localhost:8000/upload-data"

with open("alphafold_structure.json") as f:
    test_cases = json.load(f)

@pytest.mark.parametrize("case", test_cases)
def test_uniprot_payload(case):
    payload = case["payload"]
    expected_result = case["result"]
    description = case["description"]

    response = requests.post(API_URL, json=payload)

    assert response.status_code == 200, f"{description}: Unexpected status code {response.status_code}"

    try:
        actual_result = response.json()
    except ValueError:
        pytest.fail(f"{description}: Response is not valid JSON:\n{response.text}")

    assert actual_result == expected_result, f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"