import os
import json
from enum import Enum
from tasks_logger import create_logger
from predict import embed_sequences

RESULTS_FOLDER = "results"
INPUTS_URL = os.getenv('INPUTS_URL')

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

logger = create_logger('ds-plm')

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

def run_plm(id):
    logger.info(f'{id} ds_plm started')

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    os.makedirs(eval_folder, exist_ok=True)
    logger.info(f'{id} Evaluation folder created: {eval_folder}')
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED.value)

    try:
        chain_map_file = os.path.join(INPUTS_URL, id, 'chains.json')
        with open(chain_map_file, "r") as json_file:
            chain_map = json.load(json_file)
        
        seq = []
        files = chain_map.get('fasta', {}).keys()
        for file in files:
            with open(file, "r") as fasta_file:
                lines = fasta_file.readlines()
                for line in lines:
                    if line.startswith('>'):
                        continue
                    seq.append(line.strip())

        logger.info(f'{id} Parsed all FASTA files')

        embeddings = embed_sequences(seq)

        logger.info(f'{id} Successfully embedded sequences')

        #predictions = predict(embeddings)

        logger.info(f'{id} PLM prediction finished')

        update_status(status_file_path, id, StatusType.COMPLETED.value)
        
    except Exception as e:
        logger.error(f'{id} An unexpected error occurred ({type(e).__name__}): {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED.value, f"An unexpected error occurred: {str(e)}")

    logger.info(f'{id} ds_plm finished')

