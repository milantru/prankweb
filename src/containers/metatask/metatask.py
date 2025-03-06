import os
import base64
from celery import Celery
import requests
import json
from time import sleep

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

def download_pdb_file(pdb_id, output_file):
    url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_file, 'w') as file:
            file.write(response.text)
        print(f"File downloaded as text: {output_file}")
    else:
        print(f"Download failed. HTTP status: {response.status_code}")

def encode_pdb_file(filepath):
    with open(filepath, "rb") as f:
        encoded_string = base64.b64encode(f.read()).decode("utf-8")
    return encoded_string

@celery.task(name='metatask')
def run_metatask(input_method, input_data, id, existed):
    
    pdb_filepath = ""
    
    if input_method == "0":
        if not os.path.exists(f"inputs/{id}"):
            os.makedirs(f"inputs/{id}")
        pdb_filepath = f"inputs/{id}/structure.pdb"
        download_pdb_file(input_data, pdb_filepath)
    else:
        print("Maybe will be supported, maybe not")

    if not os.path.exists(pdb_filepath):
        print(f"Error: PDB file '{pdb_filepath}' not found.")
        exit(1)

    # encoded_struct = encode_pdb_file(pdb_filepath)

    try:
        result = celery.send_task('ds_foldseek', args=[id])
        print(f"Task submitted successfully. Task ID: {result.id}")
        print(f"Status: {result.status}")

    except Exception as e:
        print(f"Error submitting task: {e}")
        exit(1)