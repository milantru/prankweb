import json
import os
import tempfile
import requests
from typing import List
from Bio.PDB import PDBParser, PDBIO, NeighborSearch
from Bio.PDB.Polypeptide import three_to_index, index_to_one, is_aa
from data_format.builder import ProteinDataBuilder, SimilarProteinBuilder, BindingSite
from dataclasses import asdict


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


def extract_binding_sites_for_chain(pdb_id, pdb_file_path, input_chain) -> List[BindingSite]:
    with open(pdb_file_path, "r") as file:
        pdb = PDBParser().get_structure(pdb_id, file)

    binding_sites = []
    dist_thresh = 5  # Distance threshold for neighbor search
    atoms = list(pdb.get_atoms())
    ns = NeighborSearch(atom_list=atoms)

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
                    residue_name = index_to_one(three_to_index(residue.resname))
                    residue_index = residue.id[1]  # Get residue structure index
                    residue_dict[residue_index] = (residue_name, sequence_index)
                    sequence_index += 1
            
            for residue in chain:
                if residue.id[0].startswith("H_"):  # Identify ligand residues
                    ligand_id = residue.id  
                    ligand_resname = residue.resname
                                        
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
                binding_sites.append(
                    BindingSite(
                        id=ligand_id,
                        confidence=1,
                        residues=sorted(residues, key=lambda x: x[1])
                    )
                )
    return binding_sites

def save_results(result_folder: str, file_name: str, builder: ProteinDataBuilder):

    builder.add_metadata("foldseek")
    final_data = builder.build()

    result_file = os.path.join(result_folder, file_name)
    with open(result_file, "w") as f:
        json.dump(asdict(final_data), f, indent=4)

    print("saved", result_file)

def process_similar_protein(fields: List[str], curr_chain: str, id: str) -> SimilarProteinBuilder:
    sim_protein_pdb_id, sim_protein_chain = fields[1][:4], fields[1].split("_")[1]
    sim_builder = SimilarProteinBuilder(sim_protein_pdb_id, "FULL_SEQ_TODO???", sim_protein_chain)
    sim_builder.set_alignment_data(
        query_start=int(fields[4]) - 1,
        query_end=int(fields[5]) - 1,
        query_part=fields[6],
        similar_seq=fields[8],
        similar_start=int(fields[9]) - 1,
        similar_end=int(fields[10]) - 1,
        similar_part=fields[11]
    )
    with tempfile.NamedTemporaryFile(delete=True, suffix=".pdb") as temp_file:
        response = requests.get(PDB_FILE_URL.format(sim_protein_pdb_id))
        response.raise_for_status()
        temp_file.write(response.content)
        temp_filename = temp_file.name

        binding_sites = extract_binding_sites_for_chain(id, temp_filename, curr_chain)

        for site in binding_sites:
            sim_builder.add_binding_site(
                id=site.id,
                confidence=site.confidence,
                residues=site.residues
            )
    return sim_builder

def process_foldseek_output(result_folder, foldseek_result_file, id, query_structure_file):

    with open(foldseek_result_file) as f:
        curr_chain = None
        builder = None
        for line in f:  
            fields = line.strip().split("\t")
            input_name = fields[0]
            query_seq = fields[3]
            chain = input_name.split("_")[1] if "_" in input_name else "A"

            if curr_chain == None:
                curr_chain = chain

            if builder == None:
                builder = ProteinDataBuilder(id, chain, query_seq, "TODO")
                binding_sites = extract_binding_sites_for_chain(id, query_structure_file, curr_chain)
                for site in binding_sites:
                    builder.add_binding_site(
                        id=site.id,
                        confidence=site.confidence,
                        residues=site.residues
                    )

            if curr_chain != chain:
                save_results(result_folder, f"{id}_result_{curr_chain}.json", builder)
                curr_chain = chain
                builder = ProteinDataBuilder(id, curr_chain, query_seq, "TODO")
                binding_sites = extract_binding_sites_for_chain(id, query_structure_file, curr_chain)
                for site in binding_sites:
                    builder.add_binding_site(
                        id=site.id,
                        confidence=site.confidence,
                        residues=site.residues
                    )
            
            sim_builder = process_similar_protein(fields, curr_chain, id)
            builder.add_similar_protein(sim_builder.build())

        save_results(result_folder, f"{id}_result_{curr_chain}.json", builder)
