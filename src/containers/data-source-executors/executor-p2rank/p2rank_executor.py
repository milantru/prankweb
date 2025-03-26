import os
import subprocess
import tempfile
import json
import requests
from enum import Enum
import post_processor

RESULTS_FOLDER = "results"
INPUTS_URL = "http://apache:80/inputs/"

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

def run_p2rank(id, use_conservation=False):
    print("P2RANK")
    print(id)

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    os.makedirs(eval_folder, exist_ok=True)
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED.value)

    try:
        pdb_url = INPUTS_URL + str(id) + "/structure.pdb"
        query_structure_file = os.path.join(eval_folder, "input.pdb")

        response = requests.get(pdb_url, stream=True)
        response.raise_for_status()

        with open(query_structure_file, "wb") as struct_file:
            for chunk in response.iter_content(chunk_size=8192):
                struct_file.write(chunk)

        conservation_param = ConservationParam.HMM.value if use_conservation else ConservationParam.DEFAULT.value

        command = [
            "prank", "predict", 
            "-f", query_structure_file, 
            "-o", eval_folder, 
            "-c", conservation_param,
            "-visualizations", "0"
        ]

        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

        post_processor.process_p2rank_output(id, eval_folder, query_structure_file)

        update_status(status_file_path, id, StatusType.COMPLETED.value)

    except requests.RequestException as e:
        update_status(status_file_path, id, StatusType.FAILED.value, f"Failed to download PDB file: {str(e)}")
        print(f"Failed to download PDB file for {id}: {e}")
    except subprocess.CalledProcessError as e:
        update_status(status_file_path, id, StatusType.FAILED.value, f"P2rank crashed: {e.stderr.decode()}")
        print(f"P2rank crashed for {id}: {e.stderr.decode()}")
    except Exception as e:
        update_status(status_file_path, id, StatusType.FAILED.value, f"An unexpected error occurred: {e}")
        print(f"An unexpected error occurred: {e}")

