import requests
from Bio.PDB import PDBParser, Polypeptide, is_aa
from celery import Celery

# Celery configuration
celery = Celery('tasks', broker='amqp://guest:guest@message-broker:5672//', backend='rpc://')

ESMFOLD_URL = "https://api.esmatlas.com/foldSequence/v1/pdb/"

@celery.task(name='converter_str_to_seq')
def structure_to_sequence(id, query_structure_file):
    with open(query_structure_file, "r") as file:
        pdb = PDBParser().get_structure(id, file) 

    chains = {}
    for model in pdb:
        for chain in model:
            seq = ""
            for residue in chain:
                if (residue.id[0] == " " or residue.id[0] == "") and is_aa(residue): 
                    seq += Polypeptide.index_to_one(Polypeptide.three_to_index(residue.resname))
            chains[chain.id] = seq
    
    return chains

@celery.task(name='converter_seq_to_str')
def sequence_to_structure(sequence):
    response = requests.post(ESMFOLD_URL, data=sequence)
    print(response.status_code)
    if response.status_code == 200:
        return response.text
    