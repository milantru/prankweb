import json
import os
import requests
from Bio.PDB import PDBParser, Polypeptide, is_aa
from Bio.Data.IUPACData import protein_letters_3to1
import tempfile

from tasks_logger import create_logger

ESMFOLD_URL = 'https://api.esmatlas.com/foldSequence/v1/pdb/'
INPUTS_URL = os.getenv('INPUTS_URL')
MAPPING_FILE = "mapping.json"

def is_standard_aa(code):
    return code.capitalize() in protein_letters_3to1

logger = create_logger('converter')

def run_structure_to_sequence(id):
    """
    Downloads a PDB file by ID from shared volume, extracts amino acid sequences for each chain
    and maps sequence indices to structure residue indices.

    Args:
        id (str): Generated ID for input protein.

    Returns:
        ```
        {
            "chains": {sequence: [chain_ids]},
            "seqToStrMapping": {chain_id: {seq_index: structure_index}}
        }
        ```
        
        or None if download fails or no sequences are found.
    """
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
    seq_to_str_mapping = {}
    for model in pdb:
        for chain in model:
            seq = ""
            seq_index = 0
            for residue in chain:
                if is_aa(residue, standard=False): 
                    structure_index = residue.id[1]
                    residue = residue.resname
                    if not is_standard_aa(residue):
                        with open(MAPPING_FILE, "r") as infile:
                            mapping_dict = json.load(infile)
                        if residue in mapping_dict:
                            logger.info(f'{id} Residue {residue} found in mapping file, converting to standard residue')
                            residue = mapping_dict[residue]
                        else:
                            raise ValueError(f"Residue {residue} not found in {MAPPING_FILE}")                        
                    chain_code = chain.id
                    if chain_code not in seq_to_str_mapping:
                        seq_to_str_mapping[chain_code] = {}
                    seq_to_str_mapping[chain_code][seq_index] = structure_index
                    seq += Polypeptide.index_to_one(Polypeptide.three_to_index(residue))
                    seq_index += 1
            
            if seq != "":
                chains.setdefault(seq, []).append(chain.id)

    if len(chains) == 0:
        logger.warning(f'{id} converter_str_to_seq did not find any sequence')
        logger.info(f'{id} converter_str_to_seq finished, returning None')
        return None
    
    logger.info(f'{id} converter_str_to_seq finished, returning {len(chains)} unique sequences')
    return {
        "chains": chains,
        "seqToStrMapping": seq_to_str_mapping
    }

def run_sequence_to_structure(id):
    """
    Downloads a FASTA sequence by ID from shared volume, sends it to ESMAtlas service for structure prediction
    and returns the predicted structure as string.

    Args:
        id (str): Generated ID for the input protein.

    Returns:
        str: Predicted structure as string
        or None if download or prediction fails.
    """
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
    