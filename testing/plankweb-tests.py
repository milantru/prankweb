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

with \
  open("tests/sequence.json") as f1,\
  open("tests/alphafold_structure.json") as f2,\
  open("tests/experimental_structure.json") as f3,\
  open("tests/custom_structure.json") as f4,\
  open("tests/invalid_input_method.json") as f5:
    sequence_cases = json.load(f1)
    uniprot_cases = json.load(f2)
    pdb_cases = json.load(f3)
    custom_str_cases = json.load(f4)
    invalid_input_method_cases = json.load(f5)
    test_cases_upload_data =  sequence_cases + uniprot_cases + pdb_cases + custom_str_cases + invalid_input_method_cases

with open("tests/get_id.json") as f1:
    test_cases_get_id = json.load(f1)

with open("tests/results.json") as f1:
    test_cases_get_results = json.load(f1)

def process_post_request(payload: dict) -> str | dict:
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

def wait_for_status(results_folder: str, attempts=30) -> int:

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


@pytest.mark.parametrize("case", test_cases_upload_data, ids=[tc["description"] for tc in test_cases_upload_data])
def test_plankweb_upload_data(case):
    payload = case["payload"]
    expected_result = case["result"]
    description = case["description"]

    actual_result = process_post_request(payload)

   # assert response.status_code == 200, f"{description}: Unexpected status code {response.status_code}"

    if "error" in actual_result:
        assert isinstance(actual_result, dict)
        assert actual_result["error"].startswith(expected_result["error"]), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"
    else:
        assert isinstance(actual_result, str)
        assert actual_result.startswith(expected_result), f"{description}: Mismatch\nExpected: {expected_result}\nGot: {actual_result}"


@pytest.mark.parametrize("case", test_cases_get_id, ids=[tc["description"] for tc in test_cases_get_id])
def test_plankweb_get_id(case):
    payload = case["payload"]
    expected_result = case["result"]
    description = case["description"]

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


@pytest.mark.parametrize("case", test_cases_get_results, ids=[tc["description"] for tc in test_cases_get_results])
def test_plankweb_ds_results(case):
    payload = case["payload"]
    expected_id = case["id"]
    description = case["description"]

    id = process_post_request(payload)
    assert id.startswith(expected_id), f"{description}: Unexpected id {response.status_code}"
    
    # get result format of data source executors
    with open('files/ds_result_format.json') as ds_format_file:
        ds_result_format = json.load(ds_format_file)

    for ds_results_folder in [ f'ds_foldseek/{id}', f'ds_p2rank/{id}', f'ds_p2rank/{id}/conservation' ]:
    
        status = wait_for_status(ds_results_folder)
        assert status == 1, f"{description}[{ds_results_folder}]: Unexpected status: {status}"

        for chain in case["chains"]:
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


@pytest.mark.parametrize("case", test_cases_get_results, ids=[tc["description"] for tc in test_cases_get_results])
def test_plankweb_conservation_results(case):
    payload = case["payload"]
    expected_id = case["id"]
    description = case["description"]

    id = process_post_request(payload)
    assert id.startswith(expected_id), f"{description}: Unexpected id {response.status_code}"
    
    # get result format of data source executors
    with open('files/conservation_result_format.json') as conservation_format_file:
        conservation_result_format = json.load(conservation_format_file)

    results_folder = f'conservation/{id}'

    status = wait_for_status(results_folder)
    assert status == 1, f"{description}: Unexpected status: {status}"

    for chain in case["chains"]:
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