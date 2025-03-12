import os
import base64
from celery import Celery
import requests
import json
from time import sleep
from enum import Enum

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')
celery.conf.update({
    "task_routes": {
        "ds_foldseek": "ds_foldseek",
    }
})

FOLDSEEK_URL = "http://apache:80/foldseek/"

class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

def download_pdb_file(protein, output_file):
    url = f"https://files.rcsb.org/download/{protein}.pdb"
    response = requests.get(url)
    print(response.status_code)
    if response.status_code == 200:
        with open(output_file, 'w') as file:
            file.write(response.text)
        print(f"File downloaded as text: {output_file}")
    else:
        print(f"Download failed. HTTP status: {response.status_code}")

@celery.task(name='metatask')
def run_metatask(input_method, protein, id, existed):

    print("METATASK")
    
    pdb_filepath = ""
    
    if input_method == 0:
        if not os.path.exists(f"inputs/{id}"):
            os.makedirs(f"inputs/{id}")
        pdb_filepath = f"inputs/{id}/structure.pdb"
        if not os.path.exists(pdb_filepath):
            download_pdb_file(protein, pdb_filepath)
    else:
        print("Maybe will be supported, maybe yes") # TODO

    if not os.path.exists(pdb_filepath):
        print(f"Error: PDB file '{pdb_filepath}' not found.")
        exit(1)

    try:
        response = requests.get(FOLDSEEK_URL + str(id) + "/status.json")
        response.raise_for_status()
        status = response.json()
        
        if status.get("status") == StatusType.STARTED.value:
            print("Task already running.")
        elif status.get("status") == StatusType.COMPLETED.value:
            print("Task already completed.")
        else:
            raise KeyError

    except (requests.exceptions.HTTPError, KeyError):  
        # If file is missing (404), or missing "status" key → Submit task
        result = celery.send_task('ds_foldseek', args=[id], queue="ds_foldseek")
        print(f"Task submitted successfully. Task ID: {result.id}")

    except Exception as e:
        print(f"Error submitting task: {e}")
        exit(1)