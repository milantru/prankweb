import json
import os
import tempfile
import requests
from Bio.PDB import PDBParser, PDBIO, NeighborSearch

def get_ligands(pdb_id):
    pdb_file = f"{pdb_id}.pdb"
    url = f"https://files.rcsb.org/download/{pdb_file}"
    response = requests.get(url)
    if response.status_code == 200:
        with open(pdb_file, 'wb') as file:
            file.write(response.content)
    else:
        print(f"Download failed. HTTP status: {response.status_code}")
    
    io = PDBIO()
    with open(pdb_file, "r") as file:
        pdb = PDBParser().get_structure(pdb_id, file)
    os.remove(pdb_file)

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
            "conf": 1.0, # experimantally determined binding site
            "residues": binding_site_residues
        }
        binding_sites.append(binding_site)
    return binding_sites

def process_foldseek_output(result_folder, result_file, id):
    result_list = []

    with open(result_file) as f:
        for line in f:
            fields = line.strip().split("\t")

            sequence_mapping = {
                "query_sequence_id": fields[0],
                "target_sequence_id": fields[1],
                "alignment_length": int(fields[2]),
                "full_query_sequence": fields[3],
                "query_alignment_start": int(fields[4]),
                "query_alignment_end": int(fields[5]),
                "aligned_query_sequence": fields[6],
                "template_modeling_score": float(fields[7]),
                "full_target_sequence": fields[8],
                "target_alignment_start": int(fields[9]),
                "target_alignment_end": int(fields[10]),
                "aligned_target_sequence": fields[11]
            }

            pdb_id = sequence_mapping["target_sequence_id"][:4] # extract pdb id



            result_list.append({
                "protein_id": pdb_id,
                "binding_sites": get_ligands(pdb_id),
                "alignment_data": sequence_mapping
            })

    result_file = os.path.join(result_folder, f"{id}_result.json")
    with open(result_file, "w") as f:
        json.dump(result_list, f, indent=4)

    return result_list
