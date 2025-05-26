import os
import json
from dataclasses import asdict
from data_format.builder import ProteinDataBuilder, BindingSite, Residue

def process_plm_output(id, result_folder, predictions, seq_to_str_mapping, pdb_url):
    for prediction in predictions:
        chains = prediction['chains']
        sequence = prediction['sequence']
        binding = prediction['binding']

        for i, chain in enumerate(chains):
            protein_data_builder = ProteinDataBuilder(
                id=id,
                chain=chain,
                sequence=sequence,
                pdb_url=pdb_url
            )

            binding_site_residue_count = 0
            binding_avg = 0
            confidence_sum = 0
            binding_site_residues = []
            for index, binding_value in enumerate(binding):
                if binding_value > 0: # Assuming the values are also beyond the threshold
                    binding_site_residue_count += 1
                    confidence_sum += binding_value
                    binding_site_residues.append(
                        Residue(
                            sequenceIndex=index,
                            structureIndex=seq_to_str_mapping[chain][str(index)]
                        )
                    )

            binding_avg = confidence_sum / binding_site_residue_count
            binding_site = BindingSite(
                id=f"pocket_plm",
                confidence=binding_avg,
                residues=binding_site_residues
            )
            protein_data_builder.add_binding_site(binding_site)

            protein_data_builder.add_metadata(data_source="plm")

            protein_data = protein_data_builder.build()

            result_file = os.path.join(result_folder, f"{chain}_chain_result.json")
            with open(result_file, "w") as f:
                json.dump(asdict(protein_data), f, indent=4)
