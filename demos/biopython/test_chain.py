from Bio.PDB import PDBParser, PDBIO, NeighborSearch
from Bio.PDB.Polypeptide import three_to_index, is_aa, index_to_one

# ---HIERARCHY---
#
# STRUCTURE-MODEL-CHAIN-RESIDUE-ATOM
#
# ---HIERARCHY---

dist_thresh = 5  # Distance threshold for neighbor search
pdb = PDBParser().get_structure("2src", "6Xez.pdb")

atoms = list(pdb.get_atoms())
ns = NeighborSearch(atom_list=atoms)

chain_data = {}

for model in pdb:
    for chain in model:
        chain_id = chain.id
        residue_dict = {}
        sequence_index = 1 
        ligand_binding_sites = {}

        for residue in chain:
            if residue.id[0] == " " and is_aa(residue, standard=True):  # Exclude heteroatoms and non-amino acids
                residue_name = index_to_one(three_to_index(residue.resname))
                residue_index = residue.id[1]  # Get residue structure index
                residue_dict[residue_index] = (residue_name, sequence_index)
                sequence_index += 1
        
        for residue in chain:
            if residue.id[0].startswith("H_"):  # Identify ligand residues
                ligand_id = residue.id  
                ligand_resname = residue.resname
                
                print(f"\nFound ligand: {ligand_resname} at {ligand_id} in Chain {chain_id}")
                
                binding_residues = set()
                ligand_atoms = residue.get_atoms()
                
                for atom in ligand_atoms:
                    nearby_atoms = ns.search(atom.coord, dist_thresh)
                    
                    for nearby_atom in nearby_atoms:
                        nearby_residue = nearby_atom.get_parent()
                        if nearby_residue not in binding_residues and nearby_residue.id[0] != "W":  # Exclude water and non-amino acids
                            binding_residues.add(nearby_residue)
                            nearby_residue_name = residue.resname
                            nearby_residue_index = nearby_residue.id[1]
                            
                            if ligand_id not in ligand_binding_sites:
                                ligand_binding_sites[ligand_id] = []
                            ligand_binding_sites[ligand_id].append((nearby_residue_name, nearby_residue_index))
        
        for ligand_id, residues in ligand_binding_sites.items():
            ligand_binding_sites[ligand_id] = sorted(residues, key=lambda x: x[1])
        
        chain_data[chain_id] = {
            "residue_dict": residue_dict,
            "ligand_binding_sites": ligand_binding_sites
        }

for chain_id, data in chain_data.items():
    residue_dict = data["residue_dict"]
    ligand_binding_sites = data["ligand_binding_sites"]
    
    print(f"\nChain {chain_id}:")
    residue_names = [name for _, (name, _) in sorted(residue_dict.items())]
    residue_indices = [seq_index for _, (_, seq_index) in sorted(residue_dict.items())]
    
    print(f"Sequence: {''.join(residue_names)}")
    print(f"Residue indices: {'-'.join(map(str, residue_indices))}")
    
    print("\nBinding site residues by ligand:")
    for ligand_id, residues in ligand_binding_sites.items():
        binding_residue_names = []
        binding_residue_indices = []
        
        for residue in residues:
            nearby_residue_index = residue[1]
            if nearby_residue_index in residue_dict:
                residue_name, seq_index = residue_dict[nearby_residue_index]
                binding_residue_names.append(residue_name)
                binding_residue_indices.append(seq_index)
        
        residue_sequence = "".join(binding_residue_names)
        index_sequence = "-".join(map(str, binding_residue_indices))
        
        print(f"\nLigand {ligand_id}:")
        print(f"Residue sequence: {residue_sequence}")
        print(f"Residue indices: {index_sequence}")