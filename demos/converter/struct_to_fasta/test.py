import os
import requests
from Bio import PDB

pdb_file = "6xez.pdb"
pdb_url = f"https://files.rcsb.org/download/{pdb_file}"

if not os.path.exists(pdb_file):
    print(f"File {pdb_file} not found. Downloading...")
    
    response = requests.get(pdb_url)
    
    if response.status_code == 200:
        with open(pdb_file, "wb") as file:
            file.write(response.content)
        print(f"Downloaded {pdb_file}.")
    else:
        exit()

parser = PDB.PDBParser(QUIET=True)
structure = parser.get_structure(pdb_file, pdb_file)

chain_sequences = {}

for model in structure:
    for chain in model:
        chain_id = chain.get_id()
        sequence = []
        
        for residue in chain:
            if PDB.is_aa(residue):
                sequence.append(residue.get_resname())
        
        seq = "".join([PDB.Polypeptide.index_to_one(PDB.Polypeptide.three_to_index(res)) for res in sequence])
        
        chain_sequences[chain_id] = seq

for chain_id, seq in chain_sequences.items():
    print(f"Chain {chain_id}, Length: {len(seq)}\nSequence: {seq}\n")
