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
    if value in ('', '?', '.'):
        continue

    parts = [x.strip().upper() for x in value.split(',')]
    if len(parts) == 1 and parts[0] in standard_20_aa:
        mapping_dict[block.name] = parts[0]

with open("mapping.json", "w") as outfile:
    json.dump(mapping_dict, outfile, indent=4)
