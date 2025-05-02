import json
import os
import requests
from typing import List, Tuple
from Bio.PDB import PDBParser, PDBIO, NeighborSearch
from Bio.PDB.Polypeptide import three_to_index, index_to_one, is_aa
from data_format.builder import ProteinDataBuilder, SimilarProteinBuilder, BindingSite, Residue
from dataclasses import asdict

from tasks_logger import create_logger


#   - OUTPUT FORMAT - columns in result file [MORE](https://github.com/soedinglab/MMseqs2/wiki#custom-alignment-format-with-convertalis)
#   - `query` - Query sequence identifier
#   - `target` - Target sequence identifier
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
APACHE_URL = os.getenv('APACHE_URL')
RESULT_FILE = "{}_chain_result.json"

logger = create_logger('ds-foldseek')


def extract_binding_sites_for_chain(pdb_id, pdb_file_path, input_chain) -> Tuple[List[BindingSite], str]:
    with open(pdb_file_path, "r") as file:
        pdb = PDBParser().get_structure(pdb_id, file)

    binding_sites = []
    dist_thresh = 5  # Distance threshold for neighbor search
    atoms = list(pdb.get_atoms())
    ns = NeighborSearch(atom_list=atoms)
    chain_seq = ""

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
                    sequence_index += 1
                    chain_seq += index_to_one(three_to_index(residue.get_resname()))
            
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
    return binding_sites, chain_seq

def save_results(result_folder: str, file_name: str, builder: ProteinDataBuilder):

    builder.add_metadata("foldseek")
    final_data = builder.build()

    result_file = os.path.join(result_folder, file_name)
    logger.info(f'{id} Saving post-processor results to: {result_file}')
    with open(result_file, "w") as f:
        json.dump(asdict(final_data), f, indent=4)

    logger.info(f'{id} Results saved')

def process_similar_protein(result_folder: str, fields: List[str], curr_chain: str, id: str) -> SimilarProteinBuilder:
    sim_protein_pdb_id, sim_protein_chain = fields[1][:4], fields[1].split("_")[1]
    pdb_filename = os.path.join(result_folder, f"{sim_protein_pdb_id}.pdb")
    sim_prot_url = os.path.join(APACHE_URL, "ds_foldseek", id, f"{sim_protein_pdb_id}.pdb")

    sim_builder = SimilarProteinBuilder(sim_protein_pdb_id, fields[8], sim_protein_chain, sim_prot_url)

    sim_builder.set_alignment_data(
        query_start=int(fields[4]) - 1,
        query_end=int(fields[5]) - 1,
        query_part=fields[6],
        similar_seq=fields[8],
        similar_start=int(fields[9]) - 1,
        similar_end=int(fields[10]) - 1,
        similar_part=fields[11]
    )
    try:
        if not os.path.exists(pdb_filename):
            logger.info(f'{id} Downloading similar protein: {sim_protein_pdb_id}')
            response = requests.get(PDB_FILE_URL.format(sim_protein_pdb_id))
            response.raise_for_status()
            logger.info(f'{id} Similar protein {sim_protein_pdb_id} downloaded successfully')
            with open(pdb_filename, "wb") as f:
                f.write(response.content)
            logger.info(f'{id} Similar protein {sim_protein_pdb_id} saved to: {pdb_filename}')
        
        binding_sites, _ = extract_binding_sites_for_chain(id, pdb_filename, curr_chain)
        for binding_site in binding_sites:
            sim_builder.add_binding_site(binding_site)
    except:
        logger.error(f"Failed to download or process PDB file for {sim_protein_pdb_id}.")
        return None
    return sim_builder

def process_foldseek_output(result_folder, foldseek_result_file, id, query_structure_file, query_structure_file_url):

    with open(foldseek_result_file) as f:
        curr_chain = None
        builder = None

        chains_json = os.path.join(INPUTS_URL, id, "chains.json")
        logger.info(f'{id} Downloading chains file from: {chains_json}') 
        try:
            response = requests.get(chains_json, stream=True)
            response.raise_for_status()
        except requests.RequestException as e:
            logger.critical(f'{id} Failed to download chains file')
            return
        
        logger.info(f'{id} Chains file downloaded successfully')

        metadata = response.json()

        remaining_chains = metadata["chains"]

        logger.info(f'{id} Starting processing result file: {foldseek_result_file}')
        for line in f:  
            fields = line.strip().split("\t")
            input_name = fields[0]
            query_seq = fields[3]
            chain = input_name.split("_")[1] if "_" in input_name else "A"

            if chain in remaining_chains:
                remaining_chains.remove(chain)

            if curr_chain == None:
                curr_chain = chain

            if builder == None:
                builder = ProteinDataBuilder(id, chain, query_seq, query_structure_file_url)
                binding_sites, _ = extract_binding_sites_for_chain(id, query_structure_file, curr_chain)
                for binding_site in binding_sites:
                    builder.add_binding_site(binding_site)

            if curr_chain != chain:
                save_results(result_folder, RESULT_FILE.format(curr_chain), builder)
                curr_chain = chain
                builder = ProteinDataBuilder(id, curr_chain, query_seq, query_structure_file_url)
                binding_sites, _ = extract_binding_sites_for_chain(id, query_structure_file, curr_chain)
                for binding_site in binding_sites:
                    builder.add_binding_site(binding_site)
            
            sim_builder = process_similar_protein(result_folder, fields, curr_chain, id)

            if sim_builder is not None:
                builder.add_similar_protein(sim_builder.build())

        if builder != None:
            save_results(result_folder, RESULT_FILE.format(curr_chain), builder)

        logger.info(f'{id} Chains with no similar results: {" ".join(remaining_chains)}')
        for chain in remaining_chains:
            binding_sites, chain_seq = extract_binding_sites_for_chain(id, query_structure_file, chain)
            builder = ProteinDataBuilder(id, chain, chain_seq, query_structure_file_url)
            for binding_site in binding_sites:
                builder.add_binding_site(binding_site)
            save_results(result_folder, RESULT_FILE.format(chain), builder)
