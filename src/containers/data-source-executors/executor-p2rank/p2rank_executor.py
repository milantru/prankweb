import os
import subprocess
import tempfile
import json
import requests
from enum import Enum
import post_processor
import glob

RESULTS_FOLDER = "results"
INPUTS_URL = "http://apache:80/inputs/{id}/"
CONSERVATION_FILES_URL = "http://apache:80/conservation/{id}/"

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

class ConservationParam(Enum):
    DEFAULT = "default"
    HMM = "conservation_hmm"

os.makedirs(RESULTS_FOLDER, exist_ok=True)

def update_status(status_file_path, id, status, message=""):
    try:
        with open(status_file_path, "w") as f:
            json.dump({"status": status, "errorMessages": message}, f)
    except Exception as e:
        print(f"Error updating status for {id}: {e}")

def prepare_hom_files(id, eval_folder):
    chains_json = INPUTS_URL.format(id=id) + "chains.json"

    response = requests.get(chains_json, stream=True)
    response.raise_for_status()

    metadata = response.json()

    for chain in metadata["chains"]:
        filename = f"input{chain}.hom"
        chain_hom_file = CONSERVATION_FILES_URL.format(id=id) + filename

        response = requests.get(chain_hom_file, stream=True)
        response.raise_for_status()

        with open(os.path.join(eval_folder, filename), "wb") as hom_file:
            for chunk in response.iter_content(chunk_size=8192):
                hom_file.write(chunk)


def run_p2rank(id, params):
    print("P2RANK")
    print(id)
    
    use_conservation = params['use_conservation']

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    if use_conservation:
        eval_folder = os.path.join(eval_folder, "conservation")
    os.makedirs(eval_folder, exist_ok=True)
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED.value)

    try:
        pdb_url = INPUTS_URL.format(id=id) + "structure.pdb"
        query_structure_file = os.path.join(eval_folder, "input.pdb")

        response = requests.get(pdb_url, stream=True)
        response.raise_for_status()

        with open(query_structure_file, "wb") as struct_file:
            for chunk in response.iter_content(chunk_size=8192):
                struct_file.write(chunk)
        
        if use_conservation:
            prepare_hom_files(id, eval_folder)

        conservation_param = ConservationParam.HMM.value if use_conservation else ConservationParam.DEFAULT.value

        command = [
            "prank", "predict", 
            "-f", query_structure_file, 
            "-o", eval_folder, 
            "-c", conservation_param,
            "-visualizations", "0"
        ]

        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

        post_processor.process_p2rank_output(id, eval_folder, query_structure_file, pdb_url)

        update_status(status_file_path, id, StatusType.COMPLETED.value)
        os.remove(query_structure_file)
        for file in glob.glob(os.path.join(eval_folder, "*.hom")):
            os.remove(file)

    except requests.RequestException as e:
        update_status(status_file_path, id, StatusType.FAILED.value, f"Failed to download PDB file: {str(e)}")
        print(f"Failed to download PDB file for {id}: {e}")
    except subprocess.CalledProcessError as e:
        update_status(status_file_path, id, StatusType.FAILED.value, f"P2rank crashed: {e.stderr.decode()}")
        print(f"P2rank crashed for {id}: {e.stderr.decode()}")
    except Exception as e:
        update_status(status_file_path, id, StatusType.FAILED.value, f"An unexpected error occurred: {e}")
        print(f"An unexpected error occurred: {e}")

