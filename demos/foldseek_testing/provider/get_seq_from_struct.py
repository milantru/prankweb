from Bio import PDB

def extract_sequence_from_pdb(pdb_file):
    parser = PDB.PDBParser(QUIET=True)
    structure = parser.get_structure("protein", pdb_file)
    
    sequence = []
    ppb = PDB.PPBuilder()
    for pp in ppb.build_peptides(structure):
        sequence.append(pp.get_sequence())  

    return "".join(str(seq) for seq in sequence)

pdb_path = "4k11.pdb"
sequence = extract_sequence_from_pdb(pdb_path)
print("Extracted Sequence:", sequence)
