import os
import requests
from Bio.PDB import PDBParser, Polypeptide, is_aa
import tempfile
from tasks_logger import create_logger

ESMFOLD_URL = "https://api.esmatlas.com/foldSequence/v1/pdb/"
INPUTS_URL = os.getenv('INPUTS_URL')

logger = create_logger('converter')

def run_structure_to_sequence(id):
    logger.info("Task started")
    pdb_url = os.path.join(INPUTS_URL, f"{id}/structure.pdb")
    query_structure_file = ""

    response = requests.get(pdb_url, stream=True)
    response.raise_for_status()

    with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdb", delete=False) as struct_file:
        for chunk in response.iter_content(chunk_size=8192):
            struct_file.write(chunk)
        query_structure_file = struct_file.name
    
    with open(query_structure_file, "r") as file:
        pdb = PDBParser().get_structure(id, file) 

    chains = {}
    for model in pdb:
        for chain in model:
            seq = ""
            for residue in chain:
                if (residue.id[0] == " " or residue.id[0] == "") and is_aa(residue): 
                    seq += Polypeptide.index_to_one(Polypeptide.three_to_index(residue.resname))
            
            if seq != "":
                chains.setdefault(seq, []).append(chain.id)

    logger.info("Task finished, returning chains")
    
    return chains

def run_sequence_to_structure(id):

    # get input
    fasta_url = os.path.join(INPUTS_URL, f"{id}/sequence_1.fasta")

    response = requests.get(fasta_url)
    sequence = response.text.split('\n')[1]

    response = requests.post(ESMFOLD_URL, data=sequence)
    print(response.status_code)
    if response.status_code == 200:
        return response.text
    