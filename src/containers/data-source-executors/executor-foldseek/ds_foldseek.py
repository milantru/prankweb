import os
import subprocess
from celery import Celery
import tempfile
import json
import base64
import requests

import post_processor

# Celery configuration
celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

RESULTS_FOLDER = "results"
FOLDSEEK_DB = "foldseek_db/pdb"
STATUS_MAPPING = {
    "started": 0,
    "completed": 1,
    "failed": 2
}
INPUTS_URL = "http://apache:80/inputs/"

os.makedirs(RESULTS_FOLDER, exist_ok=True)

def update_status(status_file_path, id, status, message=""):
    try:
        with open(status_file_path, "w") as f:
            json.dump({"status": STATUS_MAPPING[status], "message": message}, f)
    except Exception as e:
        print(f"Error updating status for {id}: {e}")


@celery.task(name='ds_foldseek')
def ds_foldseek(id):

    print("FOLDSEEK")
    print(id)
    
    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    os.makedirs(eval_folder, exist_ok=True)
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, "started")

    try:
        pdb_url = INPUTS_URL + str(id) + "/structure.pdb"
        query_structure_file = ""

        response = requests.get(pdb_url, stream=True)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdb", delete=False) as struct_file:
            for chunk in response.iter_content(chunk_size=8192):
                struct_file.write(chunk)
            query_structure_file = struct_file.name
    
        foldseek_result_file = os.path.join(eval_folder, f"aln_res_{id}")

        command = [
            "foldseek", "easy-search", query_structure_file, FOLDSEEK_DB,
            foldseek_result_file, "tmp", "--max-seqs", "5",
            "--format-output", "query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln"
        ]

        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

        post_processor.process_foldseek_output(eval_folder, foldseek_result_file, id, query_structure_file)

        update_status(status_file_path, id, "completed")

    except requests.RequestException as e:
        update_status(status_file_path, id, "failed", f"Failed to download PDB file: {str(e)}")
        print(f"Failed to download PDB file for {id}: {e}")
    except subprocess.CalledProcessError as e:
        update_status(status_file_path, id, "failed", f"Foldseek crashed: {e.stderr.decode()}")
        print(f"Foldseek crashed for {id}: {e.stderr.decode()}")
    except Exception as e:
        update_status(status_file_path, id, "failed", f"An unexpected error occurred: {e}")
        print(f"An unexpected error occurred: {e}")
    finally:
        if query_structure_file and isinstance(query_structure_file, str) and os.path.exists(query_structure_file):
            os.remove(query_structure_file)
            print(f"Temporary PDB file deleted: {query_structure_file}")