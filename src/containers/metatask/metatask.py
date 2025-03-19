from enum import Enum
import os

from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
from Bio import SeqIO
from celery import Celery
import requests

################################ Celery setup ##################################

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')
celery.conf.update({
    "task_routes": {
        "ds_foldseek": "ds_foldseek",
    }
})

################################## Constants ###################################

FOLDSEEK_URL = "http://apache:80/foldseek/"
# P2RANK_URL = "http://apache:80/p2rank/"
# PLM_URL    = "http://apache:80/plm/"
# AHOJ_DB    = "http://apache:80/ahojdb/"

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

def _download_fasta_file(task_id, url):
    
    output_file = f"inputs/{task_id}/sequence.pdb"
    if os.path.exists(output_file):
        return
    
    # TODO: download file instead of saving the sequence

    # try:
    #     protein_seq = Seq(sequence)
    #     record = SeqRecord(protein_seq, id=f"Protein-{pdb_id}", description=f"{pdb_id} protein sequence")

    #     with open(output_file, "w") as file:
    #         SeqIO.write(record, file, "fasta")
    # except Exception as e:
    #     print(f"Saving fsequence to fasta format failed: {e}")

TASKS_WITH_SEQ_INPUT = [ """'plm'""" ]
TASKS_WITH_STR_INPUT = [ 'foldseek' """, 'p2rank'""" ]

router = { 
    "SEQ": {
        "input_filename": "sequence.pdb",
        "converter": "converter_str_to_seq",
        "first_tasks": TASKS_WITH_SEQ_INPUT,
        "second_tasks": TASKS_WITH_STR_INPUT
    }, 
    
    "STR": {
        "input_filename": "structure.fasta",
        "converter": "converter_seq_to_str",
        "first_tasks": TASKS_WITH_STR_INPUT,
        "second_tasks": TASKS_WITH_SEQ_INPUT
    } 
}

def _download_input(url, output_file):
    if os.path.exists(output_file):
        return
    response = requests.get(url)
    print(response.status_code)
    if response.status_code == 200:
        with open(output_file, 'w') as file:
            file.write(response.text)
        print(f"File downloaded: {output_file}")
    else:
        print(f"Download failed. HTTP status: {response.status_code}")

def _inputs_exist(input_folder):
    seq_file = input_folder + "sequence.fasta"
    str_file = input_folder + "structure.pdb"
    return os.path.exists(seq_file) and os.path.exists(str_file)

def run_tasks(task_id, id_existed, task_list):
    for task in router[input_method][task_list_name]:
        if not id_existed or not get_task_status():
            celery.send_task(task_id)


@celery.task(name='metatask')
def metatask(input_data):

    print("METATASK")

    task_id      = input_data["id"]
    id_existed   = bool(input_data["id_existed"])
    input_method = input_data['input_method']
    input_url    = input_data['url']
    input_folder = f"inputs/{task_id}/"

    os.makedirs(input_folder, exist_ok=True)
    _download_input(input_folder + router[input_method]["input_filename"], input_url)
    
    # run first tasks
    run_tasks(task_id, id_existed, router[input_method]["first_tasks"])

    if not id_existed or not _inputs_exist():
        # run converter
        celery.send_task(
            router[input_method]["converter"],
            args=[task_id],
            queue="converter"
        )

     

    # run second tasks
    run_tasks(task_id, id_existed, router[input_method]["second_tasks"])

    
    # TODO: run tasks


   
    # try:
    #     response = requests.get(FOLDSEEK_URL + str(task_id) + "/status.json")
    #     response.raise_for_status()
    #     status = response.json()
        
    #     if status.get("status") == StatusType.STARTED.value:
    #         print("Task already running.")
    #     elif status.get("status") == StatusType.COMPLETED.value:
    #         print("Task already completed.")
    #     else:
    #         raise KeyError

    # except (requests.exceptions.HTTPError, KeyError):  
    #     # If file is missing (404), or missing "status" key → Submit task
    #     result = celery.send_task('ds_foldseek', args=[task_id], queue="ds_foldseek")
    #     print(f"Task submitted successfully. Task ID: {result.id}")

    # except Exception as e:
    #     print(f"Error submitting task: {e}")
    #     exit(1)