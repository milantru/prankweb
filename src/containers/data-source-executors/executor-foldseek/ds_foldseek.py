import os
import subprocess
from celery import Celery
import tempfile
import json
import base64

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

os.makedirs(RESULTS_FOLDER, exist_ok=True)

def update_status(status_file_path, id, status, message=""):
    try:
        with open(status_file_path, "w") as f:
            json.dump({"status": STATUS_MAPPING[status], "message": message}, f)
    except Exception as e:
        print(f"Error updating status for {id}: {e}")


@celery.task(name='ds_foldseek')
def ds_foldseek(id):

    print("Sme tu")
    exit(123)
    
    eval_folder = os.path.join(RESULTS_FOLDER, f"{id}")
    os.makedirs(eval_folder, exist_ok=True)
    status_file_path = os.path.join(eval_folder, "status.json")
    update_status(status_file_path, id, "started")

    try:
        binary_structure = base64.b64decode(structure)

        with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdb", delete=False) as struct_file:
            struct_file.write(binary_structure)
            query_structure_file = struct_file.name
    
        foldseek_result_file = os.path.join(eval_folder, f"aln_res_{id}")

        command = [
            "foldseek", "easy-search", query_structure_file, FOLDSEEK_DB,
            foldseek_result_file, "tmp", "--max-seqs", "5",
            "--format-output", "query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln"
        ]

        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

        post_processor.process_foldseek_output(eval_folder, foldseek_result_file, id)

        os.remove(query_structure_file)
        update_status(status_file_path, id, "completed")

    except subprocess.CalledProcessError as e:
        update_status(status_file_path, id, "failed", f"Foldseek crashed: {e.stderr.decode()}")
        print(f"Foldseek crashed for {id}: {e.stderr.decode()}")
    except Exception as e:
        update_status(status_file_path, id, "failed", f"An unexpected error occurred: {e}")
        print(f"An unexpected error occurred: {e}")