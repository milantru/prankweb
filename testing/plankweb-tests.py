import json
import pytest
import requests
import time
import sys
import os
import urllib.parse
from Bio import SeqIO, PDB
from io import StringIO
from jsonschema import validate, ValidationError

SERVER_URL = "http://localhost:80"

UPLOAD_DATA_URL = f"{SERVER_URL}/upload-data"
ID_PROVIDER_URL = f"{SERVER_URL}/get-id"
RESULTS_URL = f"{SERVER_URL}/data/"

MAX_WAIT_SECONDS = 300  # 5 min timeout

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
    status_file = urllib.parse.urljoin(RESULTS_URL, f"{results_folder}/status.json")
    start_time = time.time()

    while True: # Should eventually timeout after 5 minutes
        try:
            response = requests.get(status_file, timeout=(15, 30))
            if response.status_code == 200:
                try:
                    status = response.json().get("status")
                    if status != 0:
                        return status
                except ValueError:
                    print("Invalid JSON in status file, retrying...")
            else:
                print(f"Status file not found yet (HTTP {response.status_code})")
        except requests.RequestException as e:
            print(f"Request error: {e}")

        if time.time() - start_time > MAX_WAIT_SECONDS:
            raise TimeoutError("Timed out waiting for status to change.")
        
        time.sleep(2)


def _get_file(file: str) -> str | None:

    start_time = time.time()
    while True: # Should eventually timeout after 5 minutes
        try:
            response = requests.get(file, timeout=(15, 30))
            if response.status_code == 200:
                return response.text
        except requests.RequestException as e:
            break

        if time.time() - start_time > MAX_WAIT_SECONDS:
            break
        
        time.sleep(2)

    return None


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

_inputs_tests = _load_test_cases(["tests/results.json"])

@pytest.mark.parametrize("test", _inputs_tests, ids=[test["description"] for test in _inputs_tests])
def test_plankweb_inputs(test):
    payload = test["payload"]
    expected_id = test["id"]
    description = test["description"]

    id = _process_post_request(payload)
    assert type(id) == str, f"{description}: Unexpected id {id}"
    assert id.startswith(expected_id), f"{description}: Unexpected id {id}"

    inputs_folder_url = urllib.parse.urljoin(
        RESULTS_URL,
        f"inputs/{id}/"
    )

    # wait for structure.pdb
    structure_file_content = _get_file(urllib.parse.urljoin(inputs_folder_url, "structure.pdb"))
    assert structure_file_content is not None, f"{description} Structure file not found"

    # try-parse structure.pdb
    try:
        parser = PDB.PDBParser(PERMISSIVE=False, QUIET=True)
        structure = parser.get_structure('Custom structure', StringIO(structure_file_content))
    except Exception:
        assert False, f"{description} Could not parse content of structure.pdb"

    # wait for chains.json and sequence_{n}.fasta
    chains_file_content = _get_file(urllib.parse.urljoin(inputs_folder_url, "chains.json"))
    assert chains_file_content is not None, f"{description} Chains file not found"

    # validate format of chains.json
    chains_json = None
    try:
        chains_json = json.loads(chains_file_content)
        
        # get format of chains.json
        with open('files/chains_json_format.json') as chains_json_format_file:
            chains_json_format = json.load(chains_json_format_file)

        validate(instance=chains_json, schema=chains_json_format)
    except json.JSONDecodeError:
        assert False, f"{description} chains.json not in json format at all"
    except ValidationError:
        assert False, f"{description} chains.json not in correct format"

    # check existence of all files according to chains.json
    chains_field_chains = chains_json["chains"]
    fasta_files_chains = []
    for fasta_file in chains_json["fasta"]:
        # wait for fasta file
        fasta_file_content = _get_file(urllib.parse.urljoin(inputs_folder_url, fasta_file))
        assert fasta_file_content is not None, f"{description} {fasta_file} file not found"

        # try-parse fasta file
        try:
            records = list(SeqIO.parse(StringIO(fasta_file_content), 'fasta'))
            amino_acids = set("ARNDCQEGHILKMFPSTWYV")
            assert len(records) > 0, f"{description} 0 records in {fasta_file}"
            for record in records:
                sequence_set = set(str(record.seq).upper())
                assert sequence_set.issubset(amino_acids), f"{description} Unknown amino-acids in {fasta_file}"
        except Exception:
            assert False, f"{description} {fasta_file} not in FASTA format"

        fasta_files_chains.extend(chains_json["fasta"][fasta_file])

    assert set(chains_field_chains) == set(fasta_files_chains), f"{description} Discrepancy between chains field and chains in fasta fiels fields"

#################################################################################################################

_ds_results_tests = _load_test_cases(["tests/results.json"])

@pytest.mark.parametrize("test", _ds_results_tests, ids=[test["description"] for test in _ds_results_tests])
def test_plankweb_ds_results(test):
    payload = test["payload"]
    expected_id = test["id"]
    description = test["description"]

    id = _process_post_request(payload)
    assert type(id) == str, f"{description}: Unexpected id {id}"
    assert id.startswith(expected_id), f"{description}: Unexpected id {id}"
    
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

#################################################################################################################

_conservation_results_tests = _load_test_cases(["tests/results.json"])

@pytest.mark.parametrize("test", _conservation_results_tests, ids=[test["description"] for test in _conservation_results_tests])
def test_plankweb_conservation_results(test):
    payload = test["payload"]
    expected_id = test["id"]
    description = test["description"]

    id = _process_post_request(payload)
    assert type(id) == str, f"{description}: Unexpected id {id}"
    assert id.startswith(expected_id), f"{description}: Unexpected id {id}"
    
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


#################################################################################################################
# BUILDER TESTS
#################################################################################################################

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src/containers/data-source-executors/data_format')))
from builder import ProteinDataBuilder, SimilarProteinBuilder, BindingSite, Residue

residues = [Residue(sequenceIndex=0, structureIndex=10), Residue(sequenceIndex=1, structureIndex=11)]
binding_site = BindingSite(id="site1", confidence=0.95, residues=residues)

def test_add_binding_site_direct_object():
    builder = ProteinDataBuilder(id="2SRC", chain="A", sequence="ABCDE", pdb_url="http://example.com/2SRC")
    builder.add_binding_site(binding_site)
    protein = builder.add_metadata("foldseek").build()
    assert protein.bindingSites[0].id == "site1"
    assert protein.bindingSites[0].confidence == 0.95
    assert len(protein.bindingSites[0].residues) == 2

def test_add_binding_site_manual_args():
    builder = ProteinDataBuilder(id="2SRC", chain="B", sequence="ABCDE", pdb_url="http://example.com/2SRC")
    builder.add_binding_site("site2", 0.85, residues)
    protein = builder.add_metadata("p2rank").build()
    assert protein.bindingSites[0].id == "site2"
    assert protein.bindingSites[0].confidence == 0.85

def test_similar_protein_builder_and_alignment():
    sp_builder = SimilarProteinBuilder(pdb_id="2SRC", sequence="ABCDE", chain="A", pdb_url="http://example.com/2SRC")
    sp_builder.add_binding_site(binding_site)
    sp_builder.set_alignment_data(
        query_start=3,
        query_end=5,
        query_part="DE",
        similar_seq="DEFGHI",
        similar_start=0,
        similar_end=2,
        similar_part="DE"
    )
    similar_protein = sp_builder.build()
    assert similar_protein.pdbId == "2SRC"
    assert similar_protein.alignmentData.querySeqAlignedPart == "DE"

def test_protein_data_builder_with_similar_protein():
    sp_builder = SimilarProteinBuilder(pdb_id="4K11", sequence="ABCDE", chain="B", pdb_url="http://example.com/4K11")
    sp_builder.set_alignment_data(0, 5, "ABCDE", "VWXYZABCDE", 5, 10, "ABCDE")
    similar_protein = sp_builder.build()

    builder = ProteinDataBuilder(id="2SRC", chain="C", sequence="ABCDE", pdb_url="http://example.com/2SRC")
    builder.add_similar_protein(similar_protein)
    builder.add_metadata("foldseek", timestamp="2024-01-01T00:00:00")
    protein = builder.build()

    assert protein.similarProteins is not None
    assert len(protein.similarProteins) == 1
    assert protein.similarProteins[0].pdbId == "4K11"
    assert protein.metadata.timestamp == "2024-01-01T00:00:00"

def test_protein_data_builder_with_similar_proteins():
    sp_builder = SimilarProteinBuilder(pdb_id="4K11", sequence="ABCDE", chain="B", pdb_url="http://example.com/4K11")
    sp_builder.set_alignment_data(0, 5, "ABCDE", "VWXYZABCDE", 5, 10, "ABCDE")
    similar_protein = sp_builder.build()
    sp_builder2 = SimilarProteinBuilder(pdb_id="5XYZ", sequence="ABCDE", chain="C", pdb_url="http://example.com/5XYZ")
    sp_builder2.set_alignment_data(0, 5, "ABCDE", "LMNOPQRSTU", 5, 10, "ABCDE")
    similar_protein2 = sp_builder2.build()
    sp_builder3 = SimilarProteinBuilder(pdb_id="6ABC", sequence="ABCDE", chain="D", pdb_url="http://example.com/6ABC")
    sp_builder3.set_alignment_data(0, 5, "ABCDE", "QRSTUVWX", 5, 10, "ABCDE")
    similar_protein3 = sp_builder3.build()

    builder = ProteinDataBuilder(id="2SRC", chain="C", sequence="ABCDE", pdb_url="http://example.com/2SRC")
    builder.add_similar_protein(similar_protein)
    builder.add_similar_protein(similar_protein2)
    builder.add_similar_protein(similar_protein3)
    builder.add_metadata("foldseek", timestamp="2024-01-01T00:00:00")
    protein = builder.build()

    assert protein.similarProteins is not None
    assert len(protein.similarProteins) == 3
    assert protein.similarProteins[0].pdbId == "4K11"
    assert protein.similarProteins[1].pdbId == "5XYZ"
    assert protein.similarProteins[2].pdbId == "6ABC"
    assert protein.similarProteins[0].alignmentData.querySeqAlignedPart == "ABCDE"
    assert protein.metadata.timestamp == "2024-01-01T00:00:00"

def test_no_metadata_error():
    builder = ProteinDataBuilder(id="2SRC", chain="A", sequence="ABCDE", pdb_url="http://example.com/2SRC")
    with pytest.raises(ValueError):
        builder.build()  # Should raise an error because metadata is not set

def test_no_alignment_data_error():
    sim_prot_builder = SimilarProteinBuilder(pdb_id="2SRC", sequence="ABCDE", chain="A", pdb_url="http://example.com/2SRC")
    with pytest.raises(ValueError):
        sim_prot_builder.build()  # Should raise an error because alignment data is not set