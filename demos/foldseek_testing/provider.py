import os
import base64
from celery import Celery
celery = Celery(__name__, broker='redis://localhost:6379/0', backend='redis://localhost:6379/0')

# Function to encode the PDB file for task submission
def encode_pdb_file(filepath):
    with open(filepath, "rb") as f:
        encoded_string = base64.b64encode(f.read()).decode("utf-8")
    return encoded_string

if __name__ == "__main__":
    pdb_filepath = "4k11.pdb"  # Path to your PDB file
    pdb_id = "4k11"  # PDB ID from filename (adjust if needed)

    if not os.path.exists(pdb_filepath):
        print(f"Error: PDB file '{pdb_filepath}' not found.")
        exit(1)

    encoded_pdb = encode_pdb_file(pdb_filepath)

    try:
        # Send the task using the celery command-line interface
        result = celery.send_task('ds_foldseek', args=[encoded_pdb, pdb_id])
        print(f"Task submitted successfully. Task ID: {result.id}")
        print(f"Status: {result.status}")

    except Exception as e:
        print(f"Error submitting task: {e}")
        exit(1)