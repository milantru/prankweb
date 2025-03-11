import json
import os
import tempfile
import requests
from Bio.PDB import PDBParser, PDBIO, NeighborSearch

def extract_binding_sites(pdb_id, query_structure_file):
    with open(query_structure_file, "r") as file:
        pdb = PDBParser().get_structure(pdb_id, file)

    atoms = list(pdb.get_atoms())
    ns = NeighborSearch(atom_list=atoms)

    dist_thresh = 5.00  # Distance threshold for neighbor search. TODO: OK ?

    residue_dict = {}
    sequence_index = 1 

    for model in pdb:
        for chain in model:
            for residue in chain:
                if residue.id[0] == " " or residue.id[0] == "":  # Only include residues that are part of the structure

                    residue_name = residue.resname
                    residue_index = residue.id[1]
                    
                    residue_dict[residue_index] = (residue_name, sequence_index)
                    sequence_index += 1

    # (key: ligand, value: list of (residue, index))
    ligand_binding_sites = {}

    for model in pdb:
        for chain in model:
            for residue in chain:
                # Identify ligand residues based on insertion code (H_) - heteroatom
                if residue.id[0].startswith("H_"):  
                    ligand_id = residue.id  # Use the residue ID tuple to identify the ligand
                                            
                    binding_residues = set()
                    ligand_atoms = residue.get_atoms()
                    
                    for atom in ligand_atoms:
                        nearby_atoms = ns.search(atom.coord, dist_thresh)
                        
                        for nearby_atom in nearby_atoms:
                            nearby_residue = nearby_atom.get_parent()  # Get residue
                            if nearby_residue not in binding_residues and nearby_residue.id[0] != "W":  # Exclude water. TODO: OK ?
                                binding_residues.add(nearby_residue)
                                nearby_residue_name = nearby_residue.resname
                                nearby_residue_index = nearby_residue.id[1]  # Get residue index in the sequence
                                
                                # Add residue to the ligand's binding site list
                                if ligand_id not in ligand_binding_sites:
                                    ligand_binding_sites[ligand_id] = []
                                ligand_binding_sites[ligand_id].append((nearby_residue_name, nearby_residue_index))

    for ligand_id, residues in ligand_binding_sites.items():
        ligand_binding_sites[ligand_id] = sorted(residues, key=lambda x: x[1])

    binding_sites = []
    for ligand_id, residues in ligand_binding_sites.items():
        binding_site_residues = []
        for residue in residues:
            nearby_residue_index = residue[1]
            if nearby_residue_index in residue_dict:
                residue_name, seq_index = residue_dict[nearby_residue_index]
                binding_site_residues.append({
                    "residue": residue_name,
                    "seq_index": seq_index
                })
        binding_site = {
            "id": ligand_id[0],
            "confidence": 1.0,              # experimantally determined binding site
            "residues": binding_site_residues
        }
        binding_sites.append(binding_site)
    return binding_sites

def process_foldseek_output(result_folder, result_file, id, query_structure_file):
    result_list = []

    with open(result_file) as f:
        for line in f:
            fields = line.strip().split("\t")

            pdb_id = fields[1][:4] # extract pdb id

            sequence_mapping = {
                "pdb_id": pdb_id,
                #"query_sequence_id": fields[0],
                #"target_sequence_id": fields[1],
                #"alignment_length": int(fields[2]),
                #"full_query_sequence": fields[3],
                "query_seq_aligned_part_start_idx": int(fields[4]) - 1, # Change 1-index to 0-index
                "query_seq_aligned_part_end_idx": int(fields[5]) - 1,
                "query_seq_aligned_part": fields[6],
                #"template_modeling_score": float(fields[7]),
                "similar_sequence": fields[8],
                "similar_seq_aligned_part_start_idx": int(fields[9]) - 1,
                "similar_seq_aligned_part_end_idx": int(fields[10]) - 1,
                "similar_seq_aligned_part": fields[11]
            }

            result_list.append({
                "id": id,
                "query_sequence": fields[3],
                "binding_sites": extract_binding_sites(pdb_id, query_structure_file),
                "similar_sequence_alignment_data": sequence_mapping
            })

    result_file = os.path.join(result_folder, f"{id}_result.json")
    with open(result_file, "w") as f:
        json.dump(result_list, f, indent=4)

    return result_list
