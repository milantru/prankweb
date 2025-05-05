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

    logger.info(f'{id} Downloading PDB file from: {pdb_url}')
    try:
        response = requests.get(pdb_url, stream=True, timeout=(10,20))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f'{id} PDB file download failed {str(e)}')
        logger.info(f'{id} converter_str_to_seq finished, returning None')
        return None

    logger.info(f'{id} PDB file downloaded successfully')

    with tempfile.NamedTemporaryFile(mode="w+", suffix=".pdb", delete=True) as struct_file:
        for chunk in response.iter_content(chunk_size=8192):
            struct_file.write(chunk.decode())
        struct_file.seek(0)
        # should be fine, parsing structure was already tried by http-server
        pdb = PDBParser().get_structure(id, struct_file) 

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
        logger.info(f'{id} converter_str_to_seq finished, returning None')
        return None
    
    logger.info(f'{id} converter_str_to_seq finished, returning {len(chains)} unique sequences')
    return chains

def run_sequence_to_structure(id):
    logger.info(f'{id} converter_seq_to_str started')

    # get input
    fasta_url = os.path.join(INPUTS_URL, f"{id}/sequence_1.fasta")

    logger.info(f'{id} Downloading FASTA file from: {fasta_url}')
    try:
        response = requests.get(fasta_url, timeout=(10,20))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f'{id} FASTA file download failed {str(e)}')
        logger.info(f'{id} converter_seq_to_str finished, returning None')
        return None

    logger.info(f'{id} FASTA file downloaded successfully')
    
    # should be fine, http-server prepared sequence properly
    sequence = response.text.split('\n')[1]

    logger.info(f'{id} Sending POST request to {ESMFOLD_URL} for structure prediction')
    try:
        response = requests.post(ESMFOLD_URL, data=sequence, timeout=(15,30))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f'{id} Structure not received: {str(e)}')
        logger.info(f'{id} converter_seq_to_str finished, returning None')
        return None
    
    if not response.text:
        logger.warning(f'{id} No text received')
        logger.info(f'{id} converter_seq_to_str finished, returning None')
        return None
        
    logger.info(f'{id} Structure received')
    logger.info(f'{id} converter_seq_to_str finished, returning text of POST response')
    return response.text
    