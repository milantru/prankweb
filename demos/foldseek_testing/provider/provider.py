import os
import base64
from celery import Celery
import requests
import json
from time import sleep

celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

def encode_pdb_file(filepath):
    with open(filepath, "rb") as f:
        encoded_string = base64.b64encode(f.read()).decode("utf-8")
    return encoded_string

if __name__ == "__main__":
    pdb_filepath = "4k11.pdb" 
    id = "4k11" # will be id from id-provider ...

    if not os.path.exists(pdb_filepath):
        print(f"Error: PDB file '{pdb_filepath}' not found.")
        exit(1)

    encoded_struct = encode_pdb_file(pdb_filepath)

    try:
        result = celery.send_task('ds_foldseek', args=[encoded_struct, id])
        print(f"Task submitted successfully. Task ID: {result.id}")
        print(f"Status: {result.status}")

    except Exception as e:
        print(f"Error submitting task: {e}")
        exit(1)

    url = "http://id-provider:5000/generate"

    # Data to be sent in the request
    data = {
        "input_type": "method1",
        "input_string": "exampleString"
    }

    # Make the POST request
    response = requests.post(url, json=data)

    # Print the response
    print(response.json())

    sleep(10.42)

    # Make the POST request
    response = requests.post(url, json=data)

    # Print the response
    print(response.json())


    ### server

    url = "http://web-server:3000/upload-data"

    # Data to be sent in the request
    data = {
        "input_type": "method1",
        "input_string": "exampleString"
    }

    # Make the POST request
    response = requests.post(url, json=data)

    # Print the response
    print(response.json())

    sleep(10.42)

    # Make the POST request
    response = requests.post(url, json=data)

    # Print the response
    print(response.json())

    sleep(1000)