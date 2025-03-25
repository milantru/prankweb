from Bio.PDB import PDBParser, PDBIO, NeighborSearch
from Bio.PDB.Polypeptide import three_to_index, index_to_one


# ---HIERARCHY---
#
# STRUCTURE-MODEL-CHAIN-RESIDUE-ATOM
#
# ---HIERARCHY---

io = PDBIO()
pdb = PDBParser().get_structure("2src", "2src.pdb")

atoms = list(pdb.get_atoms())
ns = NeighborSearch(atom_list=atoms)

dist_thresh = 5  # Distance threshold for neighbor search. TODO: OK ?

residue_dict = {}
sequence_index = 1 

for model in pdb:
    for chain in model:
        for residue in chain:
            if residue.id[0] == " " or residue.id[0] == "":  # Only include residues that are part of the structure

                residue_name = index_to_one(three_to_index(residue.resname))
                residue_index = residue.id[1]  # Get residue structure index (LEU *273*)
                
                residue_dict[residue_index] = (residue_name, sequence_index)
                sequence_index += 1

# (key: ligand, value: list of (residue, index))
ligand_binding_sites = {}

for model in pdb:
    for chain in model:
        for residue in chain:
            if residue.id[0].startswith("H_"):  # Identify ligand residues
                ligand_id = residue.id  
                ligand_resname = residue.resname
                
                print(f"\nFound ligand: {ligand_resname} at {ligand_id}")
                
                binding_residues = set()
                ligand_atoms = residue.get_atoms()
                
                for atom in ligand_atoms:
                    nearby_atoms = ns.search(atom.coord, dist_thresh)
                    
                    for nearby_atom in nearby_atoms:
                        nearby_residue = nearby_atom.get_parent()
                        if nearby_residue not in binding_residues and nearby_residue.id[0] != "W":  # Exclude water.
                            binding_residues.add(nearby_residue)
                            nearby_residue_name = nearby_residue.resname
                            nearby_residue_index = nearby_residue.id[1]
                            
                            if ligand_id not in ligand_binding_sites:
                                ligand_binding_sites[ligand_id] = []
                            ligand_binding_sites[ligand_id].append((nearby_residue_name, nearby_residue_index))

for ligand_id, residues in ligand_binding_sites.items():
    ligand_binding_sites[ligand_id] = sorted(residues, key=lambda x: x[1])

print("\nBinding site residues by ligand:")

for ligand_id, residues in ligand_binding_sites.items():
    residue_names = []
    residue_indices = []

    for residue in residues:
        nearby_residue_index = residue[1]
        if nearby_residue_index in residue_dict:
            residue_name, seq_index = residue_dict[nearby_residue_index]
            residue_names.append(residue_name)
            residue_indices.append(seq_index)

    residue_sequence = "".join(residue_names)
    index_sequence = "-".join(map(str, residue_indices))

    print(f"\nLigand {ligand_id}:")
    print(f"Residue sequence: {residue_sequence}")
    print(f"Residue indices: {index_sequence}")
for index, (name, seq_index) in sorted(residue_dict.items())[:10]:
    print(f"{index}: ({name}, {seq_index})")