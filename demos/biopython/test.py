from Bio.PDB import PDBParser, PDBIO, NeighborSearch

io = PDBIO()
pdb = PDBParser().get_structure("2src", "2src.pdb")

print(pdb)

atoms = list(pdb.get_atoms())

ns = NeighborSearch(atom_list=atoms)

dist_thresh = 4

for model in pdb:
    for chain in model:
        for residue in chain:
            if residue.id[0].startswith("H_"):  # Identifying ligand residues
                print(f"Found ligand: {residue.resname} at {residue.id}")
                
                # Get atoms in the ligand
                ligand_atoms = residue.get_atoms()
                
                # Find nearby atoms within the threshold distance
                for atom in ligand_atoms:
                    nearby_atoms = ns.search(atom.coord, dist_thresh)
                    
                    # Print or store the nearby residues (potential binding site)
                    binding_residues = set()
                    for nearby_atom in nearby_atoms:
                        nearby_residue = nearby_atom.get_parent()
                        if nearby_residue not in binding_residues and not nearby_residue.id == "HOH":
                            binding_residues.add(nearby_residue)
                            print(f"Binding site residue: {nearby_residue.resname} {nearby_residue.id}")



