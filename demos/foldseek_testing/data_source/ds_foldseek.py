import os
import subprocess
from celery import Celery
import tempfile
import json

# Celery configuration
celery = Celery('tasks', broker='amqp://guest:guest@localhost:5672//', backend='rpc://')

UPLOAD_FOLDER = "uploads"
RESULTS_FOLDER = "results"
STATUS_FOLDER = "status"
FOLDSEEK_DB = "foldseek_db/pdb"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(STATUS_FOLDER, exist_ok=True)


def update_status(pdb_id, status, message=""):
    status_file_path = os.path.join(STATUS_FOLDER, f"{pdb_id}.status")
    try:
        with open(status_file_path, "w") as f:
            json.dump({"status": status, "message": message}, f)
    except Exception as e:
        print(f"Error updating status for {pdb_id}: {e}")


@celery.task(name='ds_foldseek')
def ds_foldseek(file_content, pdb_id):
    status_file_path = os.path.join(STATUS_FOLDER, f"{pdb_id}.status")
    update_status(pdb_id, "started")

    try:
        with tempfile.NamedTemporaryFile(mode="w+t", suffix=".pdb", delete=False) as temp_file:
            temp_file.write(file_content)
            query_file = temp_file.name

        result_file = os.path.join(RESULTS_FOLDER, f"aln_res_{pdb_id}")
        command = [
            "foldseek", "easy-search", query_file, FOLDSEEK_DB,
            result_file, "tmp", "--max-seqs", "5",
            "--format-output", "query,target,alnlen,qseq,qstart,qend,qaln,alntmscore,tseq,tstart,tend,taln"
        ]

        subprocess.run(command, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        os.remove(query_file)
        update_status(pdb_id, "completed")

    except subprocess.CalledProcessError as e:
        update_status(pdb_id, "crashed", f"Foldseek crashed: {e.stderr.decode()}")
        print(f"Foldseek crashed for {pdb_id}: {e.stderr.decode()}")
    except Exception as e:
        update_status(pdb_id, "failed", f"An unexpected error occurred: {e}")
        print(f"An unexpected error occurred: {e}")