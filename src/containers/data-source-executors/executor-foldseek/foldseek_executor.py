import os
import subprocess
import json
import requests
from enum import Enum
import post_processor

from tasks_logger import create_logger

RESULTS_FOLDER = "results"
FOLDSEEK_DB = "foldseek_db/pdb"
INPUTS_URL = os.getenv('INPUTS_URL')

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

logger = create_logger('ds-foldseek')

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

def run_foldseek(id):
    logger.info(f'{id} ds_foldseek started')

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    os.makedirs(eval_folder, exist_ok=True)
    logger.info(f'{id} Evaluation folder created: {eval_folder}')
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

        foldseek_result_file = os.path.join(eval_folder, f"aln_res_{id}")

        command = [
            "foldseek", "easy-search", query_structure_file, FOLDSEEK_DB,
            foldseek_result_file, "tmp", "--max-seqs", "5",
            "--format-output", "query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln"
        ]

        logger.info(f'{id} Running foldseek subprocess: {" ".join(command)}')
        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        logger.info(f'{id} Foldseek subprocess finished')

        post_processor.process_foldseek_output(eval_folder, foldseek_result_file, id, query_structure_file, pdb_url)

        update_status(status_file_path, id, StatusType.COMPLETED.value)

    except requests.RequestException as e:
        logger.error(f'{id} PDB file download failed: {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"Failed to download PDB file: {str(e)}")
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode() # error message is from subprocess, needs different treatment
        logger.error(f'{id} Foldseek subprocess crashed: {err_msg}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"Foldseek crashed: {err_msg}")
    except Exception as e:
        logger.error(f'{id} An unexpected error occurred ({type(e).__name__}): {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"An unexpected error occurred: {str(e)}")

    logger.info(f'{id} ds_foldseek finished')

