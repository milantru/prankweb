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
PLANKWEB_BASE_URL = os.getenv('PLANKWEB_BASE_URL')

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

logger = create_logger('ds-p2rank')

os.makedirs(RESULTS_FOLDER, exist_ok=True)
logger.info(f'{id} Results folder prepared: {RESULTS_FOLDER}')

def update_status(status_file_path, id, status, message=""):
    logger.info(f'{id} Changing status in {status_file_path} to: {status}')
    try:
        with open(status_file_path, "w") as f:
            json.dump({"status": status, "errorMessages": message}, f)
        logger.info(f'{id} Status changed')
    except Exception as e:
        logger.error(f'{id} Status change failed: {str(e)}')


def prepare_hom_files(id, eval_folder):
    chains_json = os.path.join(INPUTS_URL, id, "chains.json")

    logger.info(f'{id} Downloading chains file from: {chains_json}')
    try:
        response = requests.get(chains_json, stream=True, timeout=(10,20))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.critical(f'{id} Failed to download chains file')
        return
        
    logger.info(f'{id} Chains file downloaded successfully')

    metadata = response.json()

    for chain in metadata["chains"]:
        filename = f"input{chain}.hom"
        chain_hom_file = os.path.join(CONSERVATION_FILES_URL, id, filename)

        logger.info(f'{id} Downloading hom file from: {chain_hom_file}')
        try:
            response = requests.get(chain_hom_file, stream=True, timeout=(10,20))
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error(f'{id} Failed to download hom file')
            break
        
        logger.info(f'{id} Hom file downloaded successfully')
        hom_file_path = os.path.join(eval_folder, filename)
        with open(hom_file_path, "wb") as hom_file:
            for chunk in response.iter_content(chunk_size=8192):
                hom_file.write(chunk)
        
        logger.info(f'{id} Hom file saved to: {hom_file_path}')


def run_p2rank(id, params):
    logger.info(f'{id} ds_p2rank started')
    
    use_conservation = params['use_conservation']
    input_model = params['input_model']
    logger.info(f'{id} Params> use_conservation: {use_conservation}, input_model: {input_model}')

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    if use_conservation:
        eval_folder = os.path.join(eval_folder, "conservation")
    os.makedirs(eval_folder, exist_ok=True)
    logger.info(f'{id} Evaluation folder prepared: {eval_folder}')
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED.value)

    try:
        pdb_url = os.path.join(INPUTS_URL, id, "structure.pdb")
        query_structure_file = os.path.join(eval_folder, "input.pdb")
        logger.info(f'{id} Downloading PDB file from: {pdb_url}')
        response = requests.get(pdb_url, stream=True, timeout=(10,20))
        response.raise_for_status()
        logger.info(f'{id} PDB file downloaded successfully')

        with open(query_structure_file, "wb") as struct_file:
            for chunk in response.iter_content(chunk_size=8192):
                struct_file.write(chunk)
        logger.info(f'{id} Downloaded file saved to: {query_structure_file}')

        if use_conservation:
            prepare_hom_files(id, eval_folder)

        command = [
            "prank", "predict", 
            "-f", query_structure_file, 
            "-o", eval_folder, 
            "-c", input_model,
            "-visualizations", "0"
        ]

        logger.info(f'{id} Running p2rank subprocess: {" ".join(command)}')
        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        logger.info(f'{id} P2rank subprocess finished')

        query_structure_url = os.path.join(
            PLANKWEB_BASE_URL,
            "data",
            "inputs",
            f"{id}",
            "structure.pdb"
        )

        post_processor.process_p2rank_output(
            id,
            eval_folder,
            query_structure_file,
            query_structure_url
        )

        update_status(status_file_path, id, StatusType.COMPLETED.value)
        
        logger.info(f'{id} Cleanup started')
        os.remove(query_structure_file)
        logger.info(f'{id} {query_structure_file} removed')
        for file in glob.glob(os.path.join(eval_folder, "*.hom")):
            os.remove(file)
            logger.info(f'{id} {file} removed')

    except requests.RequestException as e:
        logger.error(f'{id} Failed to download PDB file: {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"Failed to download PDB file: {str(e)}")
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode() # error message is from subprocess, needs different treatment
        logger.error(f'{id} P2rank crashed: {err_msg}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"P2rank crashed: {err_msg}")
    except Exception as e:
        logger.error(f'{id} An unexpected error occurred: {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"An unexpected error occurred: {e}")

    logger.info(f'{id} ds_foldseek finished')

