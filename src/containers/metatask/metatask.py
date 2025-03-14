import os
import base64
from celery import Celery
import requests
import json
from time import sleep
from enum import Enum

from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
from Bio import SeqIO

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')
celery.conf.update({
    "task_routes": {
        "ds_foldseek": "ds_foldseek",
    }
})

FOLDSEEK_URL = "http://apache:80/foldseek/"
PDB_FILE_URL = "https://files.rcsb.org/download/{}.pdb"
UNIPROT_FILE_URL = "https://alphafold.ebi.ac.uk/files/AF-{}-F1-model_v4.pdb"


class StatusType(Enum):
    STARTED = 0
    COMPLETED = 1
    FAILED = 2

def download_pdb_file(protein_id, output_file, input_method):
    url = PDB_FILE_URL.format(protein_id) if input_method == '0' else UNIPROT_FILE_URL.format(protein_id)
    response = requests.get(url)
    print(response.status_code)
    if response.status_code == 200:
        with open(output_file, 'w') as file:
            file.write(response.text)
        print(f"File downloaded as text: {output_file}")
    else:
        print(f"Download failed. HTTP status: {response.status_code}")

def save_sequence_to_fasta(sequence, pdb_id, output_file):
    try:
        protein_seq = Seq(sequence)
        record = SeqRecord(protein_seq, id=f"Protein-{pdb_id}", description=f"{pdb_id} protein sequence")

        with open(output_file, "w") as file:
            SeqIO.write(record, file, "fasta")
    except Exception as e:
        print(f"Saving fsequence to fasta format failed: {e}")

@celery.task(name='metatask_PDB/UNIPROT')
def run_metatask_pdb(input_data):

    print("METATASK PDB/UNIPROT")

    input_method = input_data['input_method']
    task_id = input_data["id"]
    protein_id  = input_data["pdb_code"] if 'pdb_code' in input_data else input_data["uniprot_code"] 
    
    if not os.path.exists(f"inputs/{task_id}"):
        os.makedirs(f"inputs/{task_id}")

    # download pdb file
    filepath = f"inputs/{str(task_id)}/structure.pdb"
    if not os.path.exists(filepath):
        download_pdb_file(protein_id, filepath, input_method)

    if not os.path.exists(filepath):
        print(f"Error: PDB file '{filepath}' not found.")
        exit(1)

    # save sequence
    filepath = f"inputs/{task_id}/sequence.fasta"
    if not os.path.exists(filepath):
        save_sequence_to_fasta(input_data['sequence'], protein_id, filepath)

    if not os.path.exists(filepath):
        print(f"Error: FASTA file '{filepath}' not saved.")
        exit(1)

    try:
        response = requests.get(FOLDSEEK_URL + str(task_id) + "/status.json")
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
        result = celery.send_task('ds_foldseek', args=[task_id], queue="ds_foldseek")
        print(f"Task submitted successfully. Task ID: {result.id}")

    except Exception as e:
        print(f"Error submitting task: {e}")
        exit(1)