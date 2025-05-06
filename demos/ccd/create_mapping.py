import gemmi
import json

standard_20_aa = {
    "ALA", "ARG", "ASN", "ASP", "CYS", "GLN", "GLU", "GLY", "HIS",
    "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL"
}

doc = gemmi.cif.read_file("components.cif")

mapping_dict = {}

for block in doc:
    value = block.find_value('_chem_comp.mon_nstd_parent_comp_id')
    # https://mmcif.wwpdb.org/docs/tutorials/mechanics/pdbx-mmcif-syntax.html
    # The question mark (?) is used to mark an item value as missing. 
    # A period (.) may be used to identify that there is no appropriate value for the item or that a value has been intentionally omitted.
    if value in ('', '?', '.'):
        continue
    
    # https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Items/_chem_comp.mon_nstd_parent_comp_id.html
    # The identifier for the parent component of the nonstandard component. 
    # May be a comma-separated list if this component is derived from multiple components.
    # **We focus only on the residues that have single standard parent.**
    parts = [x.strip().upper() for x in value.split(',')]
    if len(parts) == 1 and parts[0] in standard_20_aa:
        # Create mapping 
        # Non-standard residue name -> standard residue name
        mapping_dict[block.name] = parts[0]

with open("mapping.json", "w") as outfile:
    json.dump(mapping_dict, outfile, indent=4)
