import os
import json
from data_format.builder import ProteinDataBuilder, BindingSite, Residue
from dataclasses import asdict
from Bio.PDB.Polypeptide import three_to_index, index_to_one
from Bio.Data.IUPACData import protein_letters_3to1

from tasks_logger import create_logger

# _____________predictions.csv________________
# name     ,  rank,   score, probability,  ...
# pocket1  ,     1,    5.34,       0.265,  ...
# pocket2  ,     2,    4.87,       0.228,  ...
# pocket3  ,     3,    2.02,       0.043,  ...
# ____________________________________________

PREDICTION_POCKET_INDEX = 0
PREDICTION_RANK_INDEX = 1
PREDICTION_SCORE_INDEX = 2
PREDICTION_PROBABILITY_INDEX = 3

# ______________residues.csv__________________
# chain, residue_label, residue_name, score, zscore, probability, pocket
# A,        84,         THR,          0.0243,-0.3134,   0.0009,      0
# A,        85,         THR,          0.0222,-0.3143,   0.0008,      2
# A,        86,         PHE,          0.2677,-0.2047,   0.0139,      1
#_____________________________________________

CHAIN_INDEX = 0
RESIDUE_STRUCTURE_INDEX = 1
RESIDUE_INDEX = 2
POCKET_INDEX = 6

RESULT_FILE = "{}_chain_result.json"
MAPPING_FILE = "mapping.json"

logger = create_logger('ds-p2rank')

def parse_residue_index(res_id: str) -> int:
    """
    Parses a residue index that may include an insertion code as the last character (e.g., '122A' in 1GD1 protein)
    and returns the integer residue number (e.g., 122).
    """
    if res_id[-1].isalpha():
        numeric_part = res_id[:-1]
    else:
        numeric_part = res_id

    return int(numeric_part)


def is_amino_acid(code):
    return code.capitalize() in protein_letters_3to1

def read_residues(residues_result_file):
    """
    Reads the residues result file and groups data by chains.
    Residues result file is expected to be in CSV format with the following columns:
    ``` csv
    chain, residue_label, residue_name, score, zscore, probability, pocket
    A,        84,         THR,          0.0243,-0.3134,   0.0009,      0
    A,        85,         THR,          0.0222,-0.3143,   0.0008,      2
    A,        86,         PHE,          0.2677,-0.2047,   0.0139,      1
    ```
    Args:
        residues_result_file (str): Path to the residues result file.
    
    Returns:
        dict: A dictionary where keys are chain IDs (str), and values are dictionaries with:
                - 'pockets' (dict): Keys are pocket indices (int), values are dictionaries with:
                    - 'indices' (List[Residue])
                    - 'probability' (float) - not being set here
                - 'residues' (str): Sequence of residues in the chain.
    """
    grouped_data = {}
    with open(residues_result_file, 'r') as file:
        file.readline()  # Skip header
        curr_chain = None
        seq_index = 0
        for index, line in enumerate(file):
            row = [item.strip() for item in line.strip().split(',')]
            chain, structure_index, residue, pocket = row[CHAIN_INDEX], row[RESIDUE_STRUCTURE_INDEX], row[RESIDUE_INDEX], int(row[POCKET_INDEX])
            if not is_amino_acid(residue):
                with open(MAPPING_FILE, "r") as infile:
                    mapping_dict = json.load(infile)
                if residue in mapping_dict:
                    residue = mapping_dict[residue]
                elif residue == "UNK": # 'UNK' is used for unknown residues
                    residue = "X"
                else:
                    raise ValueError(f"Residue {residue} not found in {MAPPING_FILE} and is not marked as unknown (UNK)")
                
            if is_amino_acid(residue) or residue == "X":  # 'X' is used for unknown residues
                if curr_chain is None or curr_chain != chain:
                    seq_index = 0
                    curr_chain = chain
                if chain not in grouped_data:
                    grouped_data[chain] = {"pockets" : {}, "residues" : ""}
                if pocket != 0:
                    if pocket not in grouped_data[chain]["pockets"]:
                        grouped_data[chain]["pockets"][pocket] = {'indices': [], 'probability': None}
                    grouped_data[chain]["pockets"][pocket]['indices'].append(
                        Residue(
                            sequenceIndex=seq_index, 
                            structureIndex=parse_residue_index(structure_index)
                            )
                        )

                grouped_data[chain]["residues"] += index_to_one(three_to_index(residue)) if residue != "X" else residue
                seq_index += 1
    return grouped_data

def update_pocket_probabilities(pocket_prediction_result_file, grouped_data):
    """
    Enriches the grouped data with pocket probabilities, ranks, and scores from the pocket prediction result file.
    The pocket prediction result file is expected to be in CSV format with the following columns:
    ``` csv
    name     ,  rank,   score, probability
    pocket1  ,     1,    5.34,       0.265
    pocket2  ,     2,    4.87,       0.228
    pocket3  ,     3,    2.02,       0.043
    ```
    """
    with open(pocket_prediction_result_file, 'r') as file:
        file.readline()  # Skip header =+  
        for line in file:
            row = [item.strip() for item in line.strip().split(',')]
            pocket, probability = int(row[PREDICTION_POCKET_INDEX].replace("pocket", "")), float(row[PREDICTION_PROBABILITY_INDEX])
            rank, score = int(row[PREDICTION_RANK_INDEX]), float(row[PREDICTION_SCORE_INDEX])

            for chain in grouped_data:
                if pocket in grouped_data[chain]["pockets"]:
                    grouped_data[chain]["pockets"][pocket]['probability'] = probability
                    grouped_data[chain]["pockets"][pocket]['rank'] = rank
                    grouped_data[chain]["pockets"][pocket]['score'] = score

def process_p2rank_output(id, result_folder, query_file, pdb_url):
    """
    Processes the output of P2Rank, creating a result file for each chain in the protein.  
    The result file is in shared data format.

    Args:
        id (str): Generated ID for the input protein.
        result_folder (str): Folder where the results will be saved.
        query_file (str): Path to the PDB file of the input protein. Used to determine the P2Rank output files.
        pdb_url (str): URL of the input PDB file for the protein structure.
    """
    residues_result_file = query_file + "_residues.csv"
    pocket_prediction_result_file = query_file + "_predictions.csv"
    
    logger.info(f'{id} Starting to process p2rank output: {residues_result_file}, {pocket_prediction_result_file}')
    grouped_data = read_residues(residues_result_file)
    logger.info(f'{id} Data grouped by chains')
    update_pocket_probabilities(pocket_prediction_result_file, grouped_data)
    logger.info(f'{id} Pocket probabilities for grouped data updated')

    for chain, data in grouped_data.items():
        protein_data_builder = ProteinDataBuilder(id=id, chain=chain, sequence=data["residues"], pdb_url=pdb_url)
        
        sorted_pockets = sorted(data["pockets"].items(), key=lambda item: item[1]['probability'], reverse=True)

        for pocket, data in sorted_pockets:
            binding_site = BindingSite(
                id=f"pocket_{pocket}", 
                confidence=data['probability'], 
                rank=data['rank'],
                score=data['score'],
                residues=sorted(data['indices'], key=lambda x: x.sequenceIndex)
            )
            protein_data_builder.add_binding_site(binding_site)

        protein_data_builder.add_metadata(data_source="p2rank")

        protein_data = protein_data_builder.build()

        result_file = os.path.join(result_folder, RESULT_FILE.format(chain))
        with open(result_file, 'w') as json_file:
            json.dump(asdict(protein_data), json_file, indent=4)
        logger.info(f'{id} Post-processor results for chain {chain} saved to: {result_file}')