import os
import subprocess
import json
import requests
from enum import Enum
import post_processor
import glob

from tasks_logger import create_logger

RESULTS_FOLDER = "results"
INPUTS_URL = os.getenv('INPUTS_URL')
CONSERVATION_FILES_URL = os.getenv('CONSERVATION_URL')

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

logger = create_logger('ds-p2rank')


os.makedirs(RESULTS_FOLDER, exist_ok=True)

def update_status(status_file_path, id, status, message=""):
    try:
        logger.info(f'{id} Opening status file: {status_file_path}')
        with open(status_file_path, "w") as f:
            logger.info(f'{id} Changing status to {status}, msg: {message}')
            json.dump({"status": status, "errorMessages": message}, f)
        logger.info(f'{id} Status changed')
    except Exception as e:
        logger.error(f'{id} Status change failed: {str(e)}')

def prepare_hom_files(id, eval_folder):
    chains_json = os.path.join(INPUTS_URL, id, "chains.json")

    response = requests.get(chains_json, stream=True)
    response.raise_for_status()

    metadata = response.json()

    for chain in metadata["chains"]:
        filename = f"input{chain}.hom"
        chain_hom_file = os.path.join(CONSERVATION_FILES_URL, id, filename)

        response = requests.get(chain_hom_file, stream=True)
        response.raise_for_status()

        with open(os.path.join(eval_folder, filename), "wb") as hom_file:
            for chunk in response.iter_content(chunk_size=8192):
                hom_file.write(chunk)


def run_p2rank(id, params):
    logger.info(f'{id} ds_p2rank started')
    
    use_conservation = params['use_conservation']
    input_model = params['input_model']
    logger.info(f'Params: use_conservation: {use_conservation}, input_model: {input_model}')

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    if use_conservation:
        eval_folder = os.path.join(eval_folder, "conservation")
    os.makedirs(eval_folder, exist_ok=True)
    logger.info(f'{id} Evaluation folder created: {eval_folder}')
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED.value)

    try:
        pdb_url = os.path.join(INPUTS_URL, id, "structure.pdb")
        query_structure_file = os.path.join(eval_folder, "input.pdb")

        response = requests.get(pdb_url, stream=True)
        response.raise_for_status()

        with open(query_structure_file, "wb") as struct_file:
            for chunk in response.iter_content(chunk_size=8192):
                struct_file.write(chunk)
        
        if use_conservation:
            prepare_hom_files(id, eval_folder)

        command = [
            "prank", "predict", 
            "-f", query_structure_file, 
            "-o", eval_folder, 
            "-c", input_model,
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

