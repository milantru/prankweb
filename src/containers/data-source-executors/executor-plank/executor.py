import os
import json
import requests
from enum import Enum
from tasks_logger import create_logger
from status_manager import update_status, StatusType


from predict import embed_sequences, predict_bindings
from post_processor import process_plank_output

RESULTS_FOLDER = "results"
INPUTS_URL = os.getenv('INPUTS_URL')
PLANKWEB_BASE_URL = os.getenv('PLANKWEB_BASE_URL')

logger = create_logger('ds-plank')

os.makedirs(RESULTS_FOLDER, exist_ok=True)
logger.info(f'{id} Results folder prepared: {RESULTS_FOLDER}')

def run_plank(id):
    """
    Runs the Plank - pLM and neural network model to predict for each residue in protein if it belongs to a binding site.

    The function downloads input sequence data based on the provided ID from shared volume,
    embeds the sequences using a pLM and performs binding site prediction using the NN.
    It tracks progress using a status file and stores the results in a shared format
    for each chain.
    
    Args:
        id (str): Unique identifier for the input protein.
    """
    logger.info(f'{id} ds_plank started')

    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    os.makedirs(eval_folder, exist_ok=True)
    logger.info(f'{id} Evaluation folder created: {eval_folder}')
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, StatusType.STARTED, infoMessage="Execution started")

    try:
        chain_map_file = os.path.join(INPUTS_URL, id, 'chains.json')
        logger.info(f'{id} Downloading chains file from: {chain_map_file}')
        response = requests.get(chain_map_file, timeout=(10,20))
        response.raise_for_status()
        logger.info(f'{id} Chains file downloaded successfully')
        chain_map = response.json()
        
        seq = []
        seq_chains = []
        files = chain_map.get('fasta', {}).keys()
        for file in files:
            file_url = os.path.join(INPUTS_URL, id, file)
            logger.info(f'{id} Downloading FASTA file from: {file_url}')
            response = requests.get(file_url, stream=True, timeout=(10,20))
            response.raise_for_status()
            logger.info(f'{id} FASTA file downloaded successfully')

            lines = response.text.splitlines()
            for line in lines:
                if line.startswith('>'):
                    continue
                seq.append(line.strip())

            chains = chain_map.get('fasta', {}).get(file, [])
            seq_chains.append(chains)
        
        logger.info(f'{id} Parsed all FASTA files')
        update_status(status_file_path, id, StatusType.STARTED, infoMessage="Embedding sequences")


        embeddings = embed_sequences(seq)

        logger.info(f'{id} Successfully embedded sequences')
        update_status(status_file_path, id, StatusType.STARTED, infoMessage="Predicting bindings")

        lenghts = [len(s) for s in seq]
        
        result_file_path = os.path.join(eval_folder, "result.json")
        result_data = predict_bindings(embeddings, lenghts, result_file_path, seq_chains, seq)

        logger.info(f'{id} NN prediction finished')

        query_structure_url = os.path.join(
            PLANKWEB_BASE_URL,
            "data",
            "inputs",
            f"{id}",
            "structure.pdb"
        )
        seq_to_str_mapping = chain_map.get('seqToStrMapping', {})
        update_status(status_file_path, id, StatusType.STARTED, infoMessage="Processing Plank output")

        process_plank_output(
            id, 
            eval_folder, 
            result_data, 
            seq_to_str_mapping, 
            query_structure_url
            )

        update_status(status_file_path, id, StatusType.COMPLETED, infoMessage="Execution completed successfully")
        
    except requests.RequestException as e:
        logger.error(f'{id} Failed to download PDB file: {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED, errorMessage = f"Failed to download Fasta file: {str(e)}")
    except Exception as e:
        logger.error(f'{id} An unexpected error occurred: {str(e)}')
        update_status(status_file_path, id, StatusType.FAILED, errorMessage = f"An unexpected error occurred: {e}")

    logger.info(f'{id} Plank finished')

