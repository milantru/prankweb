import requests

uniprot_id = "Q5VSL9"

base_url = f"https://alphafold.ebi.ac.uk/api/prediction/{uniprot_id}"

try:
    response = requests.get(base_url)
    response.raise_for_status()
    prediction_data = response.json()

    pdb_url = prediction_data[0]["pdbUrl"]

    pdb_response = requests.get(pdb_url)
    pdb_response.raise_for_status()


    output_file = f"{uniprot_id}.pdb"
    with open(output_file, 'wb') as file:
        file.write(pdb_response.content)

    print(f"Downloaded AlphaFold PDB file for {uniprot_id} successfully as '{output_file}'")
except requests.RequestException as e:
    print(f"Failed to retrieve AlphaFold prediction data or PDB file for {uniprot_id}: {e}")
