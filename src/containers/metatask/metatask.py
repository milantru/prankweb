import json
import os
import time
from enum import Enum

import requests
from celery import Celery
from celery.result import AsyncResult

################################ Celery setup ##################################

celery = Celery(
    'tasks',
    broker='amqp://guest:guest@message-broker:5672//',
    backend='rpc://'
)
celery.conf.update({
    'task_routes': {
        'ds_foldseek': 'ds_foldseek',
        'ds_p2rank': 'ds_p2rank',
        'conservation': 'conservation',
        'converter_seq_to_str': 'converter',
        'converter_str_to_seq': 'converter'
    }
})

################################## Constants ###################################

APACHE_URL = 'http://apache:80/'

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

############################## Private functions ###############################

def _download_file_from_url(url: str, filename: str) -> None:
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, 'w') as file:
            file.write(response.text)


def _prepare_seq_input(url: str, input_folder: str) -> None:
    os.makedirs(input_folder, exist_ok=True)

    fasta_file = os.path.join(input_folder, 'sequence_1.fasta')
    chain_json = os.path.join(input_folder, 'chains.json')

    if not os.path.exists(fasta_file):
        _download_file_from_url(url, fasta_file)

    if not os.path.exists(chain_json):
        with open(chain_json, 'w') as json_file:
            json.dump(
                { 'chains': ['A'], 'fasta': {'sequence_1.fasta': ['A'] } }, 
                json_file,
                indent=4
            )


def _prepare_str_input(url: str, input_folder: str) -> None:
    os.makedirs(input_folder, exist_ok=True)
    
    pdb_file = os.path.join(input_folder, 'structure.pdb')
    
    if not os.path.exists(pdb_file):
        _download_file_from_url(url, pdb_file)


def _inputs_exist(input_folder: str) -> bool:
    seq_exists = os.path.exists(os.path.join(input_folder, 'sequence_1.fasta'))
    chains_exists = os.path.exists(os.path.join(input_folder, 'chains.json'))
    str_exists = os.path.exists(os.path.join(input_folder, 'structure.pdb'))
    return chains_exists and seq_exists and str_exists


def _save_converter_str_result(input_folder: str, result: str) -> None:
    converter_result_file = os.path.join(input_folder + 'structure.pdb') 
    with open(converter_result_file, 'w') as file:
        file.write(result)


def _save_converter_seq_result(input_folder: str, result: dict) -> None:

    chain_to_sequence_mapping = {}
    chains = []
    file_number = 1

    for sequence, chain_list in result.items():

        # get chains
        chains.extend(chain_list)

        # create fasta file
        filename = f'sequence_{file_number}.fasta'
        with open(os.path.join(input_folder, f'{filename}'), 'w') as file:
            file.write(f'> Chains: {chain_list}\n{sequence}')

        # create mapping filename<->chain_list
        chain_to_sequence_mapping[filename] = chain_list
        
        file_number += 1

    # create json
    with open(os.path.join(input_folder, 'chains.json'), 'w') as json_file:
        json.dump(
            { 'chains': chains, 'fasta': chain_to_sequence_mapping },
            json_file,
            indent=4
        )


def _is_task_running_or_completed(output_folder: str) -> bool:
    
    response = requests.get(os.path.join(output_folder, 'status.json'))
    
    if response.status_code != 200:
        return False
    
    task_status = response.json().get('status')

    return (task_status == StatusType.STARTED.value or
            task_status == StatusType.COMPLETED.value)


def _run_task(
        task_name: str,
        queue_name: str,
        id: str,
        id_existed: bool,
        output_folder: str | None = None,
        task_args: dict | None = None
) -> AsyncResult | None:
    
    if not output_folder:
        output_folder = os.path.join(APACHE_URL, task_name, id, 'status.json')
    
    if not id_existed or not _is_task_running_or_completed(output_folder):
        print(f'SENDING {task_name.upper()}')
        task = celery.send_task(
            task_name,
            args=[id, task_args] if task_args else [id],
            queue=queue_name
        )

        return task
    
    return None


def _run_plm(id, id_existed):
    _run_task(
        task_name='ds_plm',
        queue_name='ds_plm',
        id=id,
        id_existed=id_existed,
    )


def _run_foldseek(id: str, id_existed: bool) -> None:
    _run_task(
        task_name='ds_foldseek',
        queue_name='ds_foldseek',
        id=id,
        id_existed=id_existed,
    )


def _run_p2rank(id: str, id_existed: bool, use_conservation: bool) -> None:
    
    output_folder = os.path.join(APACHE_URL, 'ds_p2rank', id)
    if use_conservation:
        output_folder = os.path.join(output_folder, 'conservation')

    _run_task(
        task_name='ds_p2rank',
        queue_name='ds_p2rank',
        id=id,
        id_existed=id_existed,
        output_folder=output_folder,
        task_args={ 'use_conservation': use_conservation }
    )


def _run_conservation(id: str, id_existed: bool) -> AsyncResult | None:
    return _run_task(
        task_name='conservation',
        queue_name='conservation',
        id=id,
        id_existed=id_existed,
    )

############################### Public functions ###############################

@celery.task(name='metatask_SEQ')
def metatask_seq(input_data: dict) -> None:
    
    print('METATASK_SEQ')

    id           = input_data['id']
    id_existed   = bool(input_data['id_existed'])
    input_folder = f'inputs/{id}/'

    # prepare input
    _prepare_seq_input(input_data['input_url'], input_folder)

    # _run_plm(id, id_existed)

    conservation = _run_conservation(id, id_existed)
    
    if not id_existed or not _inputs_exist(input_folder):
        converter = celery.send_task(
            'converter_seq_to_str',
            queue='converter',
            args=[id],
        )

        # wait for converter
        while not converter.ready():
            time.sleep(0.1)

        converter_result = converter.result

        # store results
        _save_converter_str_result(input_folder, converter_result)

    _run_foldseek(id, id_existed)

    _run_p2rank(id, id_existed, use_conservation=False)

    if conservation:
        while not conservation.ready():
            time.sleep(5)

    _run_p2rank(id, id_existed, use_conservation=True)


@celery.task(name='metatask_STR')
def metatask_str(input_data: dict) -> None:
    
    print('METATASK_STR')

    id           = input_data['id']
    id_existed   = bool(input_data['id_existed'])
    input_folder = f'inputs/{id}/'

    # prepare input
    _prepare_str_input(input_data['input_url'], input_folder)

    _run_foldseek(id, id_existed)

    _run_p2rank(id, id_existed, use_conservation=False)

    if not id_existed or not _inputs_exist(input_folder):
        converter = celery.send_task(
            'converter_str_to_seq',
            queue='converter',
            args=[id],
        )

        # wait for converter
        while not converter.ready():
            time.sleep(0.1)

        converter_result = converter.result

        # store results
        _save_converter_seq_result(input_folder, converter_result)

    # _run_plm(id, id_existed)
    
    conservation = _run_conservation(id, id_existed)

    if conservation:
        while not conservation.ready():
            time.sleep(5)
    
    _run_p2rank(id, id_existed, use_conservation=True)
