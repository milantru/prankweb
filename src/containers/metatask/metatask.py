#!/usr/bin/env python3

import json
import os
import time
from enum import Enum

import requests
from celery import Celery
from celery.result import AsyncResult

from tasks_logger import create_logger

################################ Celery setup ##################################

celery = Celery(
    os.getenv('CELERY_NAME'),
    broker=os.getenv('CELERY_BROKER_URL'),
    backend=os.getenv('CELERY_BACKEND_URL')
)
celery.conf.update({
    'task_routes': {
        'ds_foldseek': 'ds_foldseek',
        'ds_p2rank': 'ds_p2rank',
        'ds_plm': 'ds_plm',
        'conservation': 'conservation',
        'converter_seq_to_str': 'converter',
        'converter_str_to_seq': 'converter'
    }
})

################################## Constants ###################################

APACHE_URL = os.getenv('APACHE_URL')
INPUTS_FOLDER = 'inputs/'

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

logger = create_logger('metatask')

############################## Private functions ###############################

def _download_file_from_url(id: str, url: str, filename: str) -> bool:
    logger.info(f'{id} Downloading file from: {url}')
    try:
        response = requests.get(url, timeout=(10,20))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f'{id} File download failed {str(e)}')
        return False
    
    logger.info(f'{id} File downloaded successfully')
    with open(filename, 'w') as file:
        file.write(response.text)
    logger.info(f'{id} File saved to: {filename}')
    return True


def  _prepare_seq_input(id: str, url: str) -> bool:

    input_folder = os.path.join(INPUTS_FOLDER, id)
    os.makedirs(input_folder, exist_ok=True)
    logger.info(f'{id} Input folder prepared: {input_folder}')

    fasta_file = os.path.join(input_folder, 'sequence_1.fasta')
    chain_json = os.path.join(input_folder, 'chains.json')

    logger.info(f'{id} Preparing {fasta_file}...')
    if not os.path.exists(fasta_file):
        if not _download_file_from_url(id, url, fasta_file):
            logger.error(f'{id} {fasta_file} cannot be prepared properly')
            return False
    
    logger.info(f'{id} {fasta_file} prepared')

    logger.info(f'{id} Preparing {chain_json}...')
    if not os.path.exists(chain_json):
        with open(chain_json, 'w') as json_file:
            json.dump(
                { 'chains': ['A'], 'fasta': {'sequence_1.fasta': ['A'] } }, 
                json_file,
                indent=4
            )
    logger.info(f'{id} {chain_json} prepared')
    return True


def _prepare_str_input(id: str, url: str) -> bool:
    
    input_folder = os.path.join(INPUTS_FOLDER, id)
    os.makedirs(input_folder, exist_ok=True)
    logger.info(f'{id} Input folder prepared: {input_folder}')

    pdb_file = os.path.join(input_folder, 'structure.pdb')
    
    logger.info(f'{id} Preparing {pdb_file}...')
    if not os.path.exists(pdb_file):
        if not _download_file_from_url(id, url, pdb_file):
            logger.error(f'{id} {pdb_file} cannot be prepared properly')
            return False
    logger.info(f'{id} {pdb_file} prepared')
    return True


def _inputs_exist(id: str) -> bool:

    seq_file = os.path.join(INPUTS_FOLDER, id, 'sequence_1.fasta')
    seq_exists = os.path.exists(seq_file)
    logger.info(f'{id} {seq_file} exists: {seq_exists}')

    chains_file = os.path.join(INPUTS_FOLDER, id, 'chains.json')
    chains_exists = os.path.exists(chains_file)
    logger.info(f'{id} {chains_file} exists: {chains_exists}')

    str_file = os.path.join(INPUTS_FOLDER, id, 'structure.pdb')
    str_exists = os.path.exists(str_file)
    logger.info(f'{id} {str_file} exists: {str_exists}')
    
    return chains_exists and seq_exists and str_exists


def _save_converter_str_result(id: str, result: str) -> None:
    converter_result_file = os.path.join(INPUTS_FOLDER, id, 'structure.pdb') 
    with open(converter_result_file, 'w') as file:
        file.write(result)
    logger.info(f'{id} Structure from converter stored to: {converter_result_file}')


def _save_converter_seq_result(id: str, result: dict) -> None:

    chain_to_sequence_mapping = {}
    chains = []
    file_number = 1

    for sequence, chain_list in result.items():

        # get chains
        chains.extend(chain_list)

        # create fasta file
        filename = f'sequence_{file_number}.fasta'
        file_path = os.path.join(INPUTS_FOLDER, id, f'{filename}')
        with open(file_path, 'w') as file:
            file.write(f'> Chains: {chain_list}\n{sequence}')
        logger.info(f'{id} Sequence for chains {str(chain_list)} stored in: {file_path}')

        # create mapping filename<->chain_list
        chain_to_sequence_mapping[filename] = chain_list
        
        file_number += 1

    # create json
    chains_file = os.path.join(INPUTS_FOLDER, id, 'chains.json')
    with open(chains_file, 'w') as json_file:
        json.dump(
            { 'chains': chains, 'fasta': chain_to_sequence_mapping },
            json_file,
            indent=4
        )
    logger.info(f'{id} Mapping between files and chains stored in: {chains_file}')


def _is_task_running_or_completed(id: str, output_folder: str) -> bool:
    
    try:
        status_url = os.path.join(output_folder, 'status.json')
        logger.info(f'{id} Getting status file from: {status_url}')
        response = requests.get(status_url, timeout=(10,20))
        response.raise_for_status()
        task_status = response.json().get('status')
        logger.info(f'{id} Status: {task_status}')
        return (task_status == StatusType.STARTED.value or
                task_status == StatusType.COMPLETED.value)
    except requests.RequestException as e:
        logger.warning(f'{id} Could not get status: {str(e)}')
        return False


def _run_task(
        task_name: str,
        id: str,
        id_existed: bool,
        output_folder: str | None = None,
        task_args: dict | None = None
) -> AsyncResult | None:
    
    if not output_folder:
        output_folder = os.path.join(APACHE_URL, task_name, id)
    
    if not id_existed or not _is_task_running_or_completed(id, output_folder):
        task_args = [id, task_args] if task_args else [id]
        logger.info(f'{id} Sending {task_name} (args: {str(task_args)})')
        task = celery.send_task(
            task_name,
            args=task_args,
        )

        return task
    
    return None


def _run_foldseek(id: str, id_existed: bool) -> None:
    _run_task(
        task_name='ds_foldseek',
        id=id,
        id_existed=id_existed,
    )


def _run_p2rank(id: str, id_existed: bool, input_model: str, use_conservation: bool) -> None:
    
    output_folder = os.path.join(APACHE_URL, 'ds_p2rank', id)
    if use_conservation:
        output_folder = os.path.join(output_folder, 'conservation')

    p2rank_models = {
        ('default', False): 'default',
        ('default', True): 'conservation_hmm', 
        ('alphafold', False): 'alphafold',  
        ('alphafold', True): 'alphafold_conservation_hmm'  
    }
    

    _run_task(
        task_name='ds_p2rank',
        id=id,
        id_existed=id_existed,
        output_folder=output_folder,
        task_args={
            'input_model': p2rank_models[(input_model, use_conservation)],
            'use_conservation': use_conservation
        }
    )


def _run_plm(id: str, id_existed: bool) -> None:
    _run_task(
        task_name='ds_plm',
        id=id,
        id_existed=id_existed,
    )


def _run_conservation(id: str, id_existed: bool) -> AsyncResult | None:
    return _run_task(
        task_name='conservation',
        id=id,
        id_existed=id_existed,
    )

############################### Public functions ###############################

@celery.task(name='metatask_SEQ')
def metatask_seq(input_data: dict) -> None:
    
    id           = input_data['id']
    id_existed   = bool(input_data['id_existed'])
    p2rank_model = input_data['input_model']

    logger.info(f'{id} metatask_SEQ started')
    
    # prepare input
    if not _prepare_seq_input(id, input_data['input_url']):
        # should not happen, downloading form apache container
        logger.critical(f'{id} Input sequence could not be prepared, all tasks are skipped')
        return

    _run_plm(id, id_existed)

    conservation = _run_conservation(id, id_existed)
    
    if not id_existed or not _inputs_exist(id):
        logger.info(f'{id} Sending converter_seq_to_str')
        converter = celery.send_task(
            'converter_seq_to_str',
            args=[id],
        )

        # wait for converter
        logger.info(f'{id} Waiting for converter result...')
        while not converter.ready():
            time.sleep(0.1)

        converter_result = converter.result
        logger.info(f'{id} Converter result received')

        if not converter_result:
            logger.warning(f'{id} Converter returned None')
        else:
            # store results
            _save_converter_str_result(id, converter_result)

    _run_foldseek(id, id_existed)

    _run_p2rank(id, id_existed, input_model=p2rank_model, use_conservation=False)

    if conservation:
        logger.info(f'{id} Waiting for conservation worker to finish...')
        while not conservation.ready():
            time.sleep(5)
        
        logger.info(f'{id} Conservation worker finished')

    _run_p2rank(id, id_existed, input_model=p2rank_model, use_conservation=True)

    logger.info(f'{id} metatask_SEQ finished')


@celery.task(name='metatask_STR')
def metatask_str(input_data: dict) -> None:
    
    id           = input_data['id']
    id_existed   = bool(input_data['id_existed'])
    p2rank_model = input_data['input_model']

    logger.info(f'{id} metatask_STR started')

    # prepare input
    if not _prepare_str_input(id, input_data['input_url']):
        # should not happen, downloading form apache container
        logger.critical(f'{id} Input structure could not be prepared, all tasks are skipped')
        return
    
    _run_foldseek(id, id_existed)

    _run_p2rank(id, id_existed, input_model=p2rank_model, use_conservation=False)

    if not id_existed or not _inputs_exist(id):
        logger.info(f'{id} Sending converter_str_to_seq')
        converter = celery.send_task(
            'converter_str_to_seq',
            args=[id],
        )

        # wait for converter
        logger.info(f'{id} Waiting for converter result...')
        while not converter.ready():
            time.sleep(0.1)

        converter_result = converter.result
        logger.info(f'{id} Converter result received')

        if not converter_result:
            logger.warning(f'{id} Converter returned None')
        else:
            # store results
            _save_converter_seq_result(id, converter_result)

    _run_plm(id, id_existed)
    
    conservation = _run_conservation(id, id_existed)

    if conservation:
        logger.info(f'{id} Waiting for conservation worker to finish...')
        while not conservation.ready():
            time.sleep(5)
        
        logger.info(f'{id} Conservation worker finished')
    
    _run_p2rank(id, id_existed, input_model=p2rank_model, use_conservation=True)

    logger.info(f'{id} metatask_STR finished')
