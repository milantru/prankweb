import json
import pytest
import requests
import os
import urllib.parse
from jsonschema import validate, ValidationError

SERVER_URL = "http://localhost:80"

UPLOAD_DATA_URL = f"{SERVER_URL}/upload-data"
ID_PROVIDER_URL = f"{SERVER_URL}/get-id"
RESULTS_URL = f"{SERVER_URL}/data/"

def _load_test_cases(test_files: list) -> list:
    
    test_cases = []
    for test_file in test_files:
        with open(test_file) as f:
            test_cases += json.load(f)

    return test_cases

def _process_post_request(payload: dict) -> str | dict:
    if 'userFile' in payload:
        # Custom structure
        with open(payload['userFile']) as f:
            files = {'userFile': (payload['userFile'], f)}
            del payload['userFile']
            response = requests.post(
                UPLOAD_DATA_URL,
                data=payload,
                files=files,
                timeout=(15,30)
            )
    else:
        # Experimental structure, AlphaFold structure, Sequence 
        response = requests.post(
            UPLOAD_DATA_URL,
            data=payload,
            timeout=(15,30)
        )

    return response.json()

def _wait_for_status(results_folder: str) -> int:

    status_file = urllib.parse.urljoin(
        RESULTS_URL,
        f"{results_folder}/status.json"
    )

    # polling status file existence
    response = requests.get(status_file, timeout=(15,30))
    while response.status_code != 200:
        response = requests.get(status_file, timeout=(15,30))

    # polling status
    status = response.json()["status"]
    while status == 0:
        response = requests.get(status_file)
        status = response.json()["status"]

    return status

#################################################################################################################

_upload_data_tests = _load_test_cases([
    "tests/experimental_structure.json",
    "tests/custom_structure.json",
    "tests/alphafold_structure.json",
    "tests/sequence.json",
    "tests/invalid_input_method.json"
])

@pytest.mark.parametrize("test", _upload_data_tests, ids=[test["description"] for test in _upload_data_tests])
def test_plankweb_upload_data(test):
    payload = test["payload"]
    expected_result = test["result"]
    description = test["description"]

    actual_result = _process_post_request(payload)

   # assert response.status_code == 200, f"{description}: Unexpected status code {response.status_code}"

    if "error" in actual_result:
        assert isinstance(actual_result, dict)
        assert actual_result["error"].startswith(expected_result["error"]), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"
    else:
        assert isinstance(actual_result, str)
        assert actual_result.startswith(expected_result), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"

#################################################################################################################

_get_id_tests = _load_test_cases(["tests/get_id.json"])

@pytest.mark.parametrize("test", _get_id_tests, ids=[test["description"] for test in _get_id_tests])
def test_plankweb_get_id(test):
    payload = test["payload"]
    expected_result = test["result"]
    description = test["description"]

    response = requests.get(ID_PROVIDER_URL, params=payload)
    actual_result = response.json()

   # assert response.status_code == 200, f"{description}: Unexpected status code {response.status_code}"

    if "id" in expected_result:
        if expected_result["id"] is None:
            assert isinstance(actual_result, dict)
            assert actual_result["id"] is None, f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"
        else:
            assert isinstance(actual_result, dict)
            assert actual_result["id"].startswith(expected_result["id"]), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"
    else: # Error
        assert isinstance(actual_result, dict)
        assert actual_result["error"].startswith(expected_result["error"]), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"

#################################################################################################################

_results_tests = _load_test_cases(["tests/results.json"])

@pytest.mark.parametrize("test", _results_tests, ids=[test["description"] for test in _results_tests])
def test_plankweb_ds_results(test):
    payload = test["payload"]
    expected_id = test["id"]
    description = test["description"]

    id = _process_post_request(payload)
    assert id.startswith(expected_id), f"{description}: Unexpected id {response.status_code}"
    
    # get result format of data source executors
    with open('files/ds_result_format.json') as ds_format_file:
        ds_result_format = json.load(ds_format_file)

    for ds_results_folder in [ f'ds_foldseek/{id}', f'ds_p2rank/{id}', f'ds_p2rank/{id}/conservation' ]:
    
        status = _wait_for_status(ds_results_folder)
        assert status == 1, f"{description}[{ds_results_folder}]: Unexpected status: {status}"

        for chain in test["chains"]:
            # download result file
            result_file = urllib.parse.urljoin(
                RESULTS_URL,
                f"{ds_results_folder}/{chain}_chain_result.json"
            )
            response = requests.get(result_file)
            result = response.json()

            # validate format of result file
            try:
                validate(instance=result, schema=ds_result_format)
            except ValidationError as e:
                assert False, f"Result format validation failed: {e.message}"
        
            # try some basic known values
            assert result["id"] == id, f"{description}: Unexpected result ID\nExpected: {id}\nGot: {result['id']}"
            assert result["chain"] == chain, f"{description}: Unexpected result chain\nExpected: {chain}\nGot: {result['chain']}"
            assert result["metadata"]["dataSource"] == ds_results_folder.split('/')[0][3:],\
                f"{description}: Unexpected data source in metadata\nExpected: {ds_results_folder.split('/')[0][3:]}\nGot: {result['metadata']['dataSource']}"


@pytest.mark.parametrize("test", _results_tests, ids=[test["description"] for test in _results_tests])
def test_plankweb_conservation_results(test):
    payload = test["payload"]
    expected_id = test["id"]
    description = test["description"]

    id = _process_post_request(payload)
    assert id.startswith(expected_id), f"{description}: Unexpected id {response.status_code}"
    
    # get result format of data source executors
    with open('files/conservation_result_format.json') as conservation_format_file:
        conservation_result_format = json.load(conservation_format_file)

    results_folder = f'conservation/{id}'

    status = _wait_for_status(results_folder)
    assert status == 1, f"{description}: Unexpected status: {status}"

    for chain in test["chains"]:
        # download result file
        result_file = urllib.parse.urljoin(
            RESULTS_URL,
            f"{results_folder}/input{chain}.json"
        )
        response = requests.get(result_file)
        result = response.json()

        # validate format of result file
        try:
            validate(instance=result, schema=conservation_result_format)
        except ValidationError as e:
            assert False, f"Result format validation failed: {e.message}"