import json
import os
import requests
import tempfile
from typing import List, Tuple, Dict
from Bio.PDB import PDBParser, PDBIO, NeighborSearch
from Bio.PDB.Polypeptide import three_to_index, index_to_one, is_aa
from data_format.builder import ProteinDataBuilder, SimilarProteinBuilder, BindingSite, Residue
from dataclasses import asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial

from tasks_logger import create_logger
from status_manager import update_status, StatusType


#   - OUTPUT FORMAT - columns in result file [MORE](https://github.com/soedinglab/MMseqs2/wiki#custom-alignment-format-with-convertalis)
#   - `query` - Query sequence identifier
#   - `target` - Target sequence identifier ---> 5d52-assembly1.cif.gz_A  first 4 characters are PDB ID, after "_" is chain ID
#   - `alnlen` - Alignment length
#   - `qseq` - Query sequence - FULL
#   - `qstart` - 1-indexed alignment start position in query sequence
#   - `qend` - 1-indexed alignment end position in query sequence
#   - `qaln` - Aligned query sequence with gaps - Only aligned part
#   - `alntmscore` - Template modeling score
#   - `tseq` - Target sequence - FULL
#   - `tstart` - 1-indexed alignment start position in target sequence
#   - `tend` - 1-indexed alignment end position in target sequence
#   - `taln` - Aligned target sequence with gaps - Only aligned part

PDB_FILE_URL = "https://files.rcsb.org/download/{}.pdb"
INPUTS_URL = os.getenv('INPUTS_URL')
PLANKWEB_BASE_URL = os.getenv('PLANKWEB_BASE_URL')
RESULT_FILE = "{}_chain_result.json"

logger = create_logger('ds-foldseek')


def extract_binding_sites_for_chain(pdb_id, pdb_file_path, input_chain) -> Tuple[List[BindingSite], str, Dict[str, int]]:
    with open(pdb_file_path, "r") as file:
        pdb = PDBParser().get_structure(pdb_id, file)

    binding_sites = []
    dist_thresh = 5  # Distance threshold for neighbor search
    atoms = list(pdb.get_atoms())
    ns = NeighborSearch(atom_list=atoms)
    chain_seq = ""
    seq_to_str_mapping = {}

    for model in pdb:
        for chain in model:
            chain_id = chain.id
            if chain_id != input_chain:
                continue
            residue_dict = {}
            sequence_index = 0
            ligand_binding_sites = {}

            for residue in chain:
                if residue.id[0] == " " and is_aa(residue, standard=True):  # Exclude heteroatoms and non-amino acids
                    residue_index = residue.id[1]  # Get residue structure index
                    residue_dict[residue_index] = sequence_index
                    seq_to_str_mapping[sequence_index] = residue_index
                    chain_seq += index_to_one(three_to_index(residue.get_resname()))
                    sequence_index += 1
            
            for residue in chain:
                if residue.id[0].startswith("H_"):  # Identify ligand residues
                    ligand_id = residue.id  
                                        
                    binding_residues = set()
                    ligand_atoms = residue.get_atoms()
                    
                    for atom in ligand_atoms:
                        nearby_atoms = ns.search(atom.coord, dist_thresh)
                        
                        for nearby_atom in nearby_atoms:
                            nearby_residue = nearby_atom.get_parent()
                            if nearby_residue not in binding_residues and nearby_residue.id[0] != "W":  # Exclude water and non-amino acids
                                binding_residues.add(nearby_residue)
                                nearby_residue_index = nearby_residue.id[1]
                                
                                if ligand_id not in ligand_binding_sites:
                                    ligand_binding_sites[ligand_id] = []
                                if residue_dict.get(nearby_residue_index, None) != None:
                                    ligand_binding_sites[ligand_id].append(
                                        Residue(
                                            sequenceIndex=residue_dict[nearby_residue_index],
                                            structureIndex=nearby_residue_index
                                            )
                                        )
            
            for ligand_id, residues in ligand_binding_sites.items():
                binding_sites.append(
                    BindingSite(
                        id=ligand_id[0], # Get ligand name from tuple e.g. ('H_ADP', 704, ' ')
                        confidence=1,
                        residues=sorted(residues, key=lambda r: r.sequenceIndex)
                    )
                )
    return binding_sites, chain_seq, seq_to_str_mapping

def save_results(result_folder: str, file_name: str, builder: ProteinDataBuilder):

    builder.add_metadata("foldseek")
    final_data = builder.build()

    result_file = os.path.join(result_folder, file_name)
    logger.info(f'{id} Saving post-processor results to: {result_file}')
    with open(result_file, "w") as f:
        json.dump(asdict(final_data), f, indent=4)

    logger.info(f'{id} Results saved')

def process_similar_protein(result_folder: str, curr_chain: str, id: str, fields: List[str]) -> SimilarProteinBuilder:
    
    sim_protein_pdb_id, sim_protein_chain = fields[1][:4], fields[1].split("_")[1][0]
    if len(id)> 4 and id[-4:] == sim_protein_pdb_id and curr_chain == sim_protein_chain:
        logger.info(f'{id} Skipping similar protein {sim_protein_pdb_id} for chain {curr_chain} as it is the same as query')
        return None
    
    sim_prot_url = PDB_FILE_URL.format(sim_protein_pdb_id)
    sim_prot_tm_score = float(fields[7]) 

    sim_builder = SimilarProteinBuilder(sim_protein_pdb_id, fields[8], sim_protein_chain, sim_prot_url, sim_prot_tm_score)

    sim_builder.set_alignment_data(
        query_start=int(fields[4]) - 1,
        query_end=int(fields[5]) - 1,
        query_part=fields[6],
        similar_seq=fields[8],
        similar_start=int(fields[9]) - 1,
        similar_end=int(fields[10]) - 1,
        similar_part=fields[11]
    )

    pdb_filename = None

    try:
        with tempfile.NamedTemporaryFile(dir=result_folder, suffix=".pdb", delete=False) as tmp_file:
            pdb_filename = tmp_file.name

            logger.info(f'{id} Downloading similar protein: {sim_protein_pdb_id}')
            response = requests.get(PDB_FILE_URL.format(sim_protein_pdb_id), timeout=(15,30))
            response.raise_for_status()
            tmp_file.write(response.content)
            logger.info(f'{id} Similar protein {sim_protein_pdb_id} saved to: {pdb_filename}')

        binding_sites, _, mapping = extract_binding_sites_for_chain(id, pdb_filename, sim_protein_chain)
        sim_builder.set_seq_to_str_mapping(mapping)
        for binding_site in binding_sites:
            sim_builder.add_binding_site(binding_site)

    except Exception as e:
        logger.error(f"Failed to download or process PDB file for {sim_protein_pdb_id}: {e}")
        return None

    finally:
        if pdb_filename is not None and os.path.exists(pdb_filename):
            os.remove(pdb_filename)

    return sim_builder

def split_foldseek_result_file(result_folder, filepath):
    output_files = {}
    result_file_base = ""

    with open(filepath, 'r') as infile:
        for line in infile:
            fields = line.strip().split("\t")
            if not fields:
                continue  # skip empty lines, should not happen in Foldseek output...

            input_name = fields[0]
            if result_file_base == "":
                result_file_base = input_name.split("_")[0]
            output_filename = os.path.join(result_folder, f"{input_name}_res")

            if input_name not in output_files:
                output_files[input_name] = open(output_filename, 'a')

            output_files[input_name].write(line)

    for f in output_files.values():
        f.close()
    
    logger.info(f"Foldseek result file split into {len(output_files)} files with base name: {result_file_base}")
    
    return result_file_base

def process_chain_result(id, chain_result_file_path, result_folder, query_structure_file, query_structure_file_url, max_workers=10):
    builder = None
    futures = []

    with open(chain_result_file_path, 'r') as file:
        for line in file:
            fields = line.strip().split("\t")
            
            if builder is None:
                input_name = fields[0]
                query_seq = fields[3]
                chain = input_name.split("_")[1] if "_" in input_name else "A"
                builder = ProteinDataBuilder(id, chain, query_seq, query_structure_file_url)
                
                binding_sites = extract_binding_sites_for_chain(id, query_structure_file, chain)[0]
                for binding_site in binding_sites:
                    builder.add_binding_site(binding_site)

            futures.append(fields)

    wrapped_fn = partial(process_similar_protein, result_folder, chain, id)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        submitted = [executor.submit(wrapped_fn, fields) for fields in futures]

        for future in as_completed(submitted):
            sim_builder = future.result()
            if sim_builder is not None:
                builder.add_similar_protein(sim_builder.build())

    if builder is not None:
        save_results(result_folder, RESULT_FILE.format(chain), builder)

def process_foldseek_output(result_folder, foldseek_result_file, id, query_structure_file, query_structure_file_url, status_file_path):

    result_file_base = split_foldseek_result_file(result_folder, foldseek_result_file)

    chains_json = os.path.join(INPUTS_URL, id, "chains.json")
    logger.info(f'{id} Downloading chains file from: {chains_json}') 
    try:
        response = requests.get(chains_json, stream=True, timeout=(10,20))
        response.raise_for_status()
    except requests.RequestException as e:
        logger.critical(f'{id} Failed to download chains file')
        raise RuntimeError(f'Failed to download chains file for {id}: {e}')
    
    logger.info(f'{id} Chains file downloaded successfully')
    metadata = response.json()
    remaining_chains = metadata["chains"]
    total_chains_count = len(remaining_chains)
    processed_chains_count = 0
    
    logger.info(f'{id} Starting processing result file: {foldseek_result_file}')
    
    for chain in remaining_chains:
        print("REMAINING CHAINS:", remaining_chains)
        result_file_path = os.path.join(result_folder, f"{result_file_base}_{chain}_res") if total_chains_count > 1 else os.path.join(result_folder, f"{result_file_base}_res")
        update_status(status_file_path, id, StatusType.STARTED, infoMessage=f"Processing Foldseek output, {total_chains_count - processed_chains_count} chains remaining")

        if os.path.exists(result_file_path):
            # Process similar proteins
            logger.info(f'{id} Processing chain {chain} from Foldseek result file: {result_file_path}')
            process_chain_result(id, result_file_path, result_folder, query_structure_file, query_structure_file_url)
        else:
            # No similar proteins found for this chain, extract binding sites only
            logger.info(f'{id} No similar proteins found for chain {chain}, extracting binding sites only')
            binding_sites, chain_seq, _ = extract_binding_sites_for_chain(id, query_structure_file, chain)
            builder = ProteinDataBuilder(id, chain, chain_seq, query_structure_file_url)
            for binding_site in binding_sites:
                builder.add_binding_site(binding_site)
            save_results(result_folder, RESULT_FILE.format(chain), builder)
        processed_chains_count += 1
    print("REMAINING CHAINS:", remaining_chains)
    logger.info(f'{id} Finished processing Foldseek output')
