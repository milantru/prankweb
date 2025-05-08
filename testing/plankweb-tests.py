import json
import pytest
import requests

API_URL = "http://localhost:80/upload-data"

with open("tests/sequence.json") as f1, open("tests/alphafold_structure.json") as f2, open("tests/experimental_structure.json") as f3:
    sequence_cases = json.load(f1)
    uniprot_cases = json.load(f2)
    pdb_cases = json.load(f3)
    test_cases = sequence_cases + uniprot_cases + pdb_cases


@pytest.mark.parametrize("case", test_cases, ids=[tc["description"] for tc in test_cases])
def test_plankweb_post_request(case):
    payload = case["payload"]
    expected_result = case["result"]
    description = case["description"]

    response = requests.post(API_URL, data=payload)

   # assert response.status_code == 200, f"{description}: Unexpected status code {response.status_code}"

    try:
        actual_result = response.json()
    except ValueError:
        pytest.fail(f"{description}: Response is not valid JSON:\n{response.text}")

    if "error" in actual_result:
        assert isinstance(actual_result, dict)
        assert actual_result["error"].startswith(expected_result["error"]), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"
    else:
        assert isinstance(actual_result, str)
        assert actual_result.startswith(expected_result), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"