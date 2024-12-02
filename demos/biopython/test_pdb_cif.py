from Bio.PDB import MMCIFParser, NeighborSearch

# ---HIERARCHY---
#
# STRUCTURE-MODEL-CHAIN-RESIDUE-ATOM
#
# ---HIERARCHY---

pdb = MMCIFParser().get_structure("2src", "2src.cif")

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
                residue_index = residue.id[1]  # Get residue structure index (LEU *273*)
                
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
                ligand_resname = residue.resname
                
                print(f"\nFound ligand: {ligand_resname} at {ligand_id}")
                
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

print("\nBinding site residues by ligand (RESIDUE, SEQUENCE INDEX):")
for ligand_id, residues in ligand_binding_sites.items():
    print(f"\nLigand {ligand_id}:")
    print("Number of residues in binding site:", len(residues))
    
    for residue in residues:
        nearby_residue_index = residue[1]
        if nearby_residue_index in residue_dict:
            residue_name, structure_index = residue_dict[nearby_residue_index]
            print(f"Residue: {residue_name}, Structure Index: {nearby_residue_index}, Sequence Index: {structure_index}")
        else:
            print(f"Residue with Sequence Index: {nearby_residue_index} not found in residue_dict")


# # Print the residue dictionary
# print("\nResidue dictionary (STRUCTURE INDEX: (RESIDUE_NAME, SEQUENCE_INDEX)):")
# for index, (name, struct_index) in residue_dict.items():
#     print(f"{index}: {name}, Sequence Index: {struct_index}")
