import requests
from Bio.PDB import PDBParser, Polypeptide

ESMFOLD_URL = "https://api.esmatlas.com/foldSequence/v1/pdb/"

# TODO: inputs
def structure_to_sequence(id, query_structure_file):
    with open(query_structure_file, "r") as file:
        pdb = PDBParser().get_structure(id, file) 

    seq = ""

    for model in pdb:
        for chain in model:
            for residue in chain:
                if residue.id[0] == " " or residue.id[0] == "": 
                    seq += Polypeptide.index_to_one(Polypeptide.three_to_index(residue.resname))
            # TODO: multiple chains
            # seq = seq + ":" + chain.id + " " 
    
    return seq

def sequence_to_structure(sequence):
    response = requests.post(ESMFOLD_URL, data=sequence)
    print(response.status_code)
    if response.status_code == 200:
        return response.text
    