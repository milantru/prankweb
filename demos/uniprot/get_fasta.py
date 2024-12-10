import requests

def fetch_fasta_from_uniprot(uniprot_id, output_file):
    url = f"https://rest.uniprot.org/uniprotkb/{uniprot_id}.fasta"
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_file, 'w') as file:
            file.write(response.text)
        print(f"FASTA file saved: {output_file}")
    else:
        print(f"Failed to fetch FASTA. HTTP status: {response.status_code}")

uniprot_id = "Q5VSL9"
output_file = f"{uniprot_id}.fasta"
fetch_fasta_from_uniprot(uniprot_id, output_file)
