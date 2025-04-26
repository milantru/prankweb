import os
import requests
from Bio.PDB import PDBParser, Polypeptide, is_aa
import tempfile

from tasks_logger import create_logger

ESMFOLD_URL = 'https://api.esmatlas.com/foldSequence/v1/pdb/'
INPUTS_URL = os.getenv('INPUTS_URL')

logger = create_logger('converter')

def run_structure_to_sequence(id):
    logger.info(f'{id} converter_str_to_seq started')

    pdb_url = os.path.join(INPUTS_URL, f"{id}/structure.pdb")

    logger.info(f'{id} Downloading PDB file from apache url: {pdb_url}')
    response = requests.get(pdb_url, stream=True)
    if response.status_code == 200:
        logger.info(f'{id} PDB file downloaded successfully {response.status_code}')
    else:
        logger.error(f'{id} PDB file download failed {response.status_code}')
        logger.info(f'{id} converter_str_to_seq finished, returning no sequence')
        return {}

    with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdb", delete=False) as struct_file:
        for chunk in response.iter_content(chunk_size=8192):
            struct_file.write(chunk)
        query_structure_file = struct_file.name
    
    with open(query_structure_file, "r") as file:
        # should be fine, parsing structure was already tried by http-server
        pdb = PDBParser().get_structure(id, file) 

    logger.info(f'{id} Starting the extraction of chains')
    chains = {}
    for model in pdb:
        for chain in model:
            seq = ""
            for residue in chain:
                if (residue.id[0] == " " or residue.id[0] == "") and is_aa(residue, standard=True): 
                    seq += Polypeptide.index_to_one(Polypeptide.three_to_index(residue.resname))
            
            if seq != "":
                chains.setdefault(seq, []).append(chain.id)

    if len(chains) == 0:
        logger.warning(f'{id} converter_str_to_seq did not find any sequence')
    
    logger.info(f'{id} converter_str_to_seq finished, returning {len(chains)} unique sequences')
    
    return chains

def run_sequence_to_structure(id):
    logger.info(f'{id} converter_seq_to_str started')

    # get input
    fasta_url = os.path.join(INPUTS_URL, f"{id}/sequence_1.fasta")

    logger.info(f'{id} Downloading FASTA file from apache url: {fasta_url}')
    response = requests.get(fasta_url)
    if response.status_code == 200:
        logger.info(f'{id} FASTA file downloaded successfully {response.status_code}')
    else:
        logger.error(f'{id} FASTA file download failed {response.status_code}')
        logger.info(f'{id} converter_seq_to_str finished, returning an empty string')
        return ""

    # should be fine, http-server prepared sequence properly
    sequence = response.text.split('\n')[1]

    logger.info(f'{id} Sending HTTP POST to {ESMFOLD_URL} to get predicted structure')
    response = requests.post(ESMFOLD_URL, data=sequence)
    if response.status_code == 200:
        logger.info(f'{id} Structure received {response.status_code}')
        logger.info(f'{id} converter_seq_to_str finished, returning structure')
        return response.text
    else:
        logger.error(f'{id} Structure not received {response.status_code}')
        logger.info(f'{id} converter_seq_to_str finished, returning an empty string')
        return ""
    