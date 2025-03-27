from enum import Enum
import os

from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
from Bio import SeqIO
from celery import Celery
import requests
import time
import json

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

TASKS_WITH_SEQ_INPUT = [] # [ 'plm'' ]
TASKS_WITH_STR_INPUT = [ 'foldseek', 'p2rank' ]

def download_input(url, input_file):
    
    if os.path.exists(input_file):
        return
    
    response = requests.get(url)
    print(response.status_code)
    
    if response.status_code == 200:
        with open(input_file, 'w') as file:
            file.write(response.text)
        print(f'File downloaded: {input_file}')
    else:
        print(f'Download failed. HTTP status: {response.status_code}')

def inputs_exist(input_folder):
    
    seq_exists = False
    for filename in os.listdir(input_folder):
        if filename.endswith(".fasta"):
            seq_exists = True
            break

    str_file = input_folder + 'structure.pdb'
    str_exists = os.path.exists(str_file)

    return seq_exists and str_exists

def is_task_running_or_completed(task, task_id):
    
    response = requests.get(APACHE_URL + f'{task}/{task_id}/status.json')
    
    if response.status_code != 200:
        return False
    
    task_status = response.json().get('status')

    return (task_status == StatusType.STARTED.value or
            task_status == StatusType.COMPLETED.value)

def extract_args_p2rank(input_data):
    return {
        'use_conservation': input_data['use_conservation']
    }

def extract_args(task, input_data):
    match task:
        case 'foldseek': return None
        case 'p2rank': return extract_args_p2rank(input_data)
        case 'plm': return None

def run_tasks(id, id_existed, task_list, input_data):
    for task in task_list:
        if not id_existed or not is_task_running_or_completed(task, id):
            args = extract_args(task, input_data)
            print(f'SENDING {task.upper()}')
            celery.send_task(
                f'ds_{task}',
                args=[id, args] if args else [id],
                queue=f'ds_{task}'
            )

def save_converter_str_result(input_folder, result: str):
    converter_result_file = input_folder + 'structure.pdb' 
    with open(converter_result_file, 'w') as file:
        file.write(result)

def save_converter_seq_result(input_folder, result: dict):

    chain_to_sequence_mapping = {}
    file_number = 1

    for sequence, chain_list in result.items():
        
        # create fasta file
        filename = f'sequence_{file_number}.fasta'
        with open(input_folder + filename, 'w') as file:
            file.write(f'> Chains: {chain_list}\n{sequence}')

        # create mapping filename<->chain_list
        chain_to_sequence_mapping[filename] = chain_list
        
        file_number += 1

    # create json
    with open(input_folder + 'chains.json', 'w') as json_file:
        json.dump(chain_to_sequence_mapping, json_file, indent=4)

router = { 
    'SEQ': {
        'input_file': 'sequence.fasta',
        'converter': 'converter_seq_to_str',
        'converter_result_function': save_converter_str_result,
        'first_tasks': TASKS_WITH_SEQ_INPUT,
        'second_tasks': TASKS_WITH_STR_INPUT
    }, 
    
    'STR': {
        'input_file': 'structure.pdb',
        'converter': 'converter_str_to_seq',
        'converter_result_function': save_converter_seq_result,
        'first_tasks': TASKS_WITH_STR_INPUT,
        'second_tasks': TASKS_WITH_SEQ_INPUT
    } 
}

@celery.task(name='metatask')
def metatask(input_data):

    print('METATASK')

    id           = input_data['id']
    id_existed   = bool(input_data['id_existed'])
    input_method = input_data['input_method']      # 'STR' / 'SEQ'
    input_url    = input_data['input_url']
    input_folder = f'inputs/{id}/'

    # prepare input
    os.makedirs(input_folder, exist_ok=True)
    download_input(input_url, input_folder + router[input_method]['input_file'])
    
    # run first tasks
    run_tasks(id, id_existed, router[input_method]['first_tasks'], input_data)

    # prepare second input
    if not id_existed or not inputs_exist(input_folder):
        # run converter
        print(f'SENDING CONVERTER')
        converter = celery.send_task(
            router[input_method]['converter'],
            args=[id],
            queue='converter'
        )

        # wait for converter
        while not converter.ready():
            time.sleep(0.1)

        converter_result = converter.result

        # store results
        router[input_method]['converter_result_function'](input_folder, converter_result)
          

        print(f'CONVERTER RESULT SAVED')

    # run second tasks
    run_tasks(id, id_existed, router[input_method]['second_tasks'], input_data)